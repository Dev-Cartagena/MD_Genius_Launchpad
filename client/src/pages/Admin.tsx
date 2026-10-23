import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { cohortStatusMessage, isCohortRunning } from "@/lib/cohorts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlockLoader } from "@/components/brand";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/utils";
import { formatCohortDate } from "@/lib/dates";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, Application, Project, Cohort, MentorWithProfile } from "@shared/schema";

// Admin Components
import AdminRoadmapManager from "@/components/Admin/AdminRoadmapManager";
import AdminCurriculumManager from "@/components/Admin/AdminCurriculumManager";
import AdminInvestorManager from "@/components/Admin/AdminInvestorManager";
import { getApplicationTitle, getApplicationDescription } from "@/lib/applicationUtils";
import {
  Users,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  UserCheck,
  GraduationCap,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Shield,
  MessageCircle,
  Star
} from "lucide-react";

const cohortSchema = z.object({
  name: z.string().min(3, "Cohort name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
});

type CohortFormData = z.infer<typeof cohortSchema>;

// User management schemas
const userRoles = ["public_visitor", "applicant", "participant", "mentor", "investor", "administrator"] as const;

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(userRoles, { required_error: "Please select a role" }),
});

const inviteUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(userRoles, { required_error: "Please select a role" }),
});

type EditUserFormData = z.infer<typeof editUserSchema>;
type InviteUserFormData = z.infer<typeof inviteUserSchema>;

// Mentor management schemas. Expertise and industries are edited as comma-separated text.
const editMentorProfileSchema = z.object({
  expertise: z.string().optional(),
  bio: z.string().optional(),
  industries: z.string().optional(),
  isActive: z.boolean().optional(),
});

const splitList = (value: string | undefined) =>
  (value || "").split(",").map((part) => part.trim()).filter(Boolean);

// Sessions have no status column: derive it from the end time.
const sessionStatus = (session: { endTime?: string | Date | null }) =>
  session.endTime && new Date(session.endTime).getTime() < Date.now() ? "Completed" : "Upcoming";

type EditMentorProfileFormData = z.infer<typeof editMentorProfileSchema>;

// Sentence-case label for any snake_case value (statuses, roles).
const humanize = (value?: string | null) => {
  const text = (value || "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

// Application status badges: draft = dashed, waiting = Mist, in review stages = Steel,
// accepted = Navy, rejected = error tint.
const applicationStatusClass = (status: string) => {
  switch (status) {
    case "draft":
      return "border-dashed border-steel/60 bg-transparent text-muted-foreground";
    case "accepted":
      return "border-transparent bg-primary text-primary-foreground";
    case "rejected":
      return "border-transparent bg-destructive/10 text-destructive";
    case "shortlisted":
    case "interview":
    case "offer":
      return "border-transparent bg-accent text-accent-foreground";
    default:
      return "border-transparent bg-secondary text-foreground";
  }
};

function ApplicationStatusBadge({ status, className, ...props }: { status: string; className?: string; "data-testid"?: string }) {
  return (
    <Badge variant="outline" className={cn(applicationStatusClass(status), className)} {...props}>
      {humanize(status)}
    </Badge>
  );
}

// Active / live = Navy, inactive = muted, not yet started = dashed.
const activeBadgeClass = (active: boolean) =>
  active ? "border-transparent bg-primary text-primary-foreground" : "border-transparent bg-muted text-muted-foreground";
const sessionBadgeClass = (status: string) =>
  status === "Completed"
    ? "border-transparent bg-primary text-primary-foreground"
    : "border-dashed border-steel/60 bg-transparent text-muted-foreground";

// Admin-specific types for processed data
interface ProcessedApplication {
  id: string;
  applicant: string;
  project: string;
  status: string;
  submittedDays: number;
  score: number;
  email?: string | null;
  description?: string;
  reviewerNotes?: string[];
}

interface AdminMetrics {
  totalApplications: number;
  acceptanceRate: number;
  activeCohorts: number;
  totalProjects: number;
  totalUsers: number;
}

interface SystemAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
}

interface ApplicationStatusDialogProps {
  application: ProcessedApplication;
  updateStatus: any; // Keep this as any for now since it's a mutation function
}

// Application Status Dialog Component (module scope so its state survives parent re-renders)
function ApplicationStatusDialog({ application, updateStatus }: ApplicationStatusDialogProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = () => {
    if (!selectedStatus) {
      toast({
        title: "Select a status",
        description: "Choose the new status before saving.",
        variant: "destructive",
      });
      return;
    }

    updateStatus.mutate(
      {
        id: application.id,
        status: selectedStatus,
        notes: reviewerNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSelectedStatus("");
          setReviewerNotes("");
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm"
          data-testid={`button-update-status-${application.id}`}
        >
          Update status
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update application status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Application by {application.applicant} for {application.project}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">Current status</label>
              <div>
                <ApplicationStatusBadge status={application.status} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">New status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under review</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="font-display text-sm font-medium">Reviewer notes</label>
            <Textarea 
              placeholder="Add a note for the review record (optional)"
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              data-testid={`textarea-reviewer-notes-${application.id}`}
            />
          </div>
          
          {application.reviewerNotes && application.reviewerNotes.length > 0 && (
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">Previous notes</label>
              <div className="space-y-1">
                {application.reviewerNotes.map((note: string, index: number) => (
                  <p key={index} className="rounded-md border bg-muted p-2 text-xs text-muted-foreground">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              className="w-full sm:w-auto"
              onClick={handleStatusUpdate}
              disabled={updateStatus.isPending || !selectedStatus}
              data-testid={`button-confirm-status-${application.id}`}
            >
              {updateStatus.isPending ? "Updating..." : "Update status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const [selectedTab, setSelectedTab] = useState("overview");
  // Lifted so the curriculum cohort selection survives switching admin tabs
  const [curriculumCohort, setCurriculumCohort] = useState<string | null>(null);
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState("all");
  const [viewingApplication, setViewingApplication] = useState<ProcessedApplication | null>(null);
  
  // User management state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isCreateCohortOpen, setIsCreateCohortOpen] = useState(false);
  
  // Mentor management state
  const [viewingMentor, setViewingMentor] = useState<MentorWithProfile | null>(null);
  const [editingMentor, setEditingMentor] = useState<MentorWithProfile | null>(null);

  // Search state
  const [mentorSearch, setMentorSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "administrator";

  // Fetch admin data
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/admin/applications"],
    enabled: isAdmin,
  });

  // Admin endpoint: includes inactive cohorts so they can be reactivated.
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/admin/cohorts"],
    enabled: isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    enabled: isAdmin,
  });

  const { data: mentors = [], isLoading: mentorsLoading } = useQuery<MentorWithProfile[]>({
    queryKey: ["/api/mentors"],
    enabled: isAdmin,
  });

  const { data: recentSessions = [], isLoading: sessionsLoading } = useQuery<
    { id: string; title: string; startTime: string; endTime: string; participantIds?: string[] | null }[]
  >({
    queryKey: ["/api/admin/sessions"],
    enabled: isAdmin,
  });

  // Calculate real admin metrics from API data
  const adminMetrics = useMemo((): AdminMetrics => {
    const totalApplications = applications.length;
    const acceptedApps = applications.filter((app: Application) => app.status === 'accepted').length;
    const acceptanceRate = totalApplications > 0 ? Math.round((acceptedApps / totalApplications) * 100) : 0;
    // Running = active and today within its dates (not merely flagged active).
    const activeCohorts = cohorts.filter((cohort: Cohort) => isCohortRunning(cohort)).length;
    const totalProjects = projects.length;
    
    return {
      totalApplications,
      acceptanceRate,
      activeCohorts,
      totalProjects,
      totalUsers: users.length,
    };
  }, [applications, cohorts, projects, users]);

  // Process real applications data with user information
  const recentApplications = useMemo((): ProcessedApplication[] => {
    return applications.map((app: Application) => {
      const user = users.find((u: User) => u.id === app.userId);
      const submittedDate = new Date(app.submittedAt || app.createdAt!);
      const daysDiff = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: app.id!,
        applicant: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown user' : 'Unknown user',
        project: getApplicationTitle(app.answers),
        status: app.status || 'draft',
        submittedDays: daysDiff,
        score: (app.scores as any)?.total || 0,
        email: user?.email,
        description: getApplicationDescription(app.answers),
        reviewerNotes: app.reviewerNotes || []
      };
    }).sort((a: ProcessedApplication, b: ProcessedApplication) => a.submittedDays - b.submittedDays); // Most recent first
  }, [applications, users]);

  // Generate dynamic system alerts from real data
  const systemAlerts = useMemo((): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    
    // Check for pending reviews
    const pendingReviews = applications.filter((app: Application) => app.status === 'submitted').length;
    if (pendingReviews > 0) {
      alerts.push({
        id: "pending-reviews",
        type: "warning",
        title: "Applications waiting for review",
        message: `${pendingReviews} application${pendingReviews > 1 ? 's' : ''} awaiting review`,
        priority: pendingReviews > 5 ? "high" : "medium"
      });
    }
    
    // Check for active cohorts
    const cohortMessage = cohortStatusMessage(cohorts);
    if (cohortMessage) {
      alerts.push({
        id: "active-cohorts",
        type: "info",
        title: "Active cohorts",
        message: cohortMessage,
        priority: "low"
      });
    }
    
    // Check for recent accepted applications
    const recentAccepted = applications.filter((app: Application) => {
      const appDate = new Date(app.updatedAt || app.createdAt!);
      const daysDiff = (Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24);
      return app.status === 'accepted' && daysDiff <= 7;
    }).length;
    
    if (recentAccepted > 0) {
      alerts.push({
        id: "recent-accepted",
        type: "success",
        title: "New participants",
        message: `${recentAccepted} application${recentAccepted > 1 ? 's' : ''} accepted this week`,
        priority: "low"
      });
    }
    
    return alerts;
  }, [applications, cohorts]);

  // Form for creating cohorts
  const cohortForm = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      capacity: 15,
    },
  });

  // Edit cohort state and form
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const editCohortForm = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      capacity: 15,
    },
  });

  // Mentor profile form
  const editMentorForm = useForm<EditMentorProfileFormData>({
    resolver: zodResolver(editMentorProfileSchema),
    defaultValues: {
      expertise: "",
      bio: "",
      industries: "",
      isActive: true,
    },
  });

  // Admin screens read /api/admin/cohorts; applicants read the public /api/cohorts.
  const invalidateCohorts = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/cohorts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
  };

  const handleMutationError = (error: unknown, fallback: string) => {
    if (isUnauthorizedError(error as Error)) {
      toast({
        title: "Signed out",
        description: "Your session has ended. Taking you to sign in.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
    toast({
      title: "Something went wrong",
      description: getApiErrorMessage(error, fallback),
      variant: "destructive",
    });
  };

  // Activate / deactivate a cohort
  const setCohortActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/cohorts/${id}`, { isActive });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: variables.isActive ? "Cohort reactivated" : "Cohort deactivated",
        description: variables.isActive
          ? "Applicants can see this cohort again."
          : "This cohort is now hidden from applicants.",
      });
      invalidateCohorts();
    },
    onError: (error) => handleMutationError(error, "The cohort could not be updated. Please try again."),
  });

  // Create cohort mutation
  const createCohort = useMutation({
    mutationFn: async (data: CohortFormData) => {
      const response = await apiRequest("POST", "/api/admin/cohorts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cohort created",
        description: "The new cohort is saved.",
      });
      setIsCreateCohortOpen(false);
      invalidateCohorts();
      cohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Something went wrong",
        description: "The cohort could not be created. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update cohort mutation
  const updateCohort = useMutation({
    mutationFn: async (data: CohortFormData) => {
      if (!editingCohort) throw new Error("No cohort being edited");
      const response = await apiRequest("PATCH", `/api/admin/cohorts/${editingCohort.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cohort updated",
        description: "Your changes are saved.",
      });
      invalidateCohorts();
      setEditingCohort(null);
      editCohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Something went wrong",
        description: "The cohort could not be updated. Please try again.",
        variant: "destructive",
      });
    }
  });

  const mentorProfilePayload = (data: EditMentorProfileFormData) => ({
    bio: data.bio || undefined,
    expertise: splitList(data.expertise),
    industries: splitList(data.industries),
    isActive: data.isActive ?? true,
  });

  // Create a profile for a mentor user who doesn't have one yet
  const createMentorProfile = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditMentorProfileFormData }) => {
      const response = await apiRequest("POST", "/api/admin/mentors", { userId, ...mentorProfilePayload(data) });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mentor profile created",
        description: "The mentor now appears to participants.",
      });
      setEditingMentor(null);
      editMentorForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => handleMutationError(error, "The mentor profile could not be created. Please try again."),
  });

  // Update mentor profile mutation
  const updateMentorProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditMentorProfileFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/mentors/${id}`, mentorProfilePayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mentor profile updated",
        description: "Your changes are saved.",
      });
      setEditingMentor(null);
      editMentorForm.reset();
      // Invalidate mentor queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Something went wrong",
        description: "The mentor profile could not be updated. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handler for opening edit dialog
  const handleEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    // Format dates to string format expected by the form
    const startDate = new Date(cohort.startDate).toISOString().split('T')[0];
    const endDate = new Date(cohort.endDate).toISOString().split('T')[0];
    
    editCohortForm.reset({
      name: cohort.name,
      description: cohort.description || "",
      startDate,
      endDate,
      capacity: cohort.capacity,
    });
  };

  // Mentor management handlers
  const handleViewMentor = (mentor: MentorWithProfile) => {
    setViewingMentor(mentor);
  };

  const handleEditMentor = (mentor: MentorWithProfile) => {
    setEditingMentor(mentor);
    // Reset form with mentor profile data
    editMentorForm.reset({
      expertise: (mentor.mentorProfile?.expertise || []).join(", "),
      bio: mentor.mentorProfile?.bio || "",
      industries: (mentor.mentorProfile?.industries || []).join(", "),
      isActive: mentor.mentorProfile?.isActive ?? true,
    });
  };

  const handleEditMentorSubmit = (data: EditMentorProfileFormData) => {
    if (!editingMentor) return;
    if (editingMentor.mentorProfile) {
      updateMentorProfile.mutate({ id: editingMentor.mentorProfile.id, data });
    } else {
      createMentorProfile.mutate({ userId: editingMentor.id, data });
    }
  };

  // Update application status mutation
  const updateApplicationStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}/status`, {
        status,
        reviewerNotes: notes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The application status is saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Accepting an application can change the applicant's role
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Something went wrong",
        description: "The application could not be updated. Please try again.",
        variant: "destructive",
      });
    }
  });

  // User management mutations
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditUserFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "Your changes are saved.",
      });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Something went wrong",
        description: "The user could not be updated. Please try again.",
        variant: "destructive",
      });
    }
  });

  const inviteUser = useMutation({
    mutationFn: async (data: InviteUserFormData) => {
      const response = await apiRequest("POST", "/api/admin/users/invite", data);
      return response.json();
    },
    onSuccess: (result: { inviteEmailSent?: boolean }) => {
      if (result?.inviteEmailSent) {
        toast({
          title: "Invitation sent",
          description: "The invitation email has been sent.",
        });
      } else {
        toast({
          title: "User created",
          description: "Email is not configured, so no invitation was sent.",
        });
      }
      setIsInviteUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      
      // Handle specific error message from backend
      const errorMessage = error?.message?.includes("already exists")
        ? "A user with this email address already exists."
        : getApiErrorMessage(error, "The invitation could not be sent. Please try again.");

      toast({
        title: "Something went wrong",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const matchesSearch = (search: string, ...values: (string | null | undefined)[]) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return values.some((value) => value?.toLowerCase().includes(term));
  };

  const filteredMentors = mentors.filter((mentor) =>
    matchesSearch(
      mentorSearch,
      mentor.firstName,
      mentor.lastName,
      mentor.email,
      ...(mentor.mentorProfile?.expertise || []),
      ...(mentor.mentorProfile?.industries || []),
    ),
  );

  const filteredUsers = users.filter((u) =>
    matchesSearch(userSearch, u.firstName, u.lastName, u.email, u.role),
  );

  const filteredApplications = recentApplications.filter((app: ProcessedApplication) => 
    selectedApplicationStatus === "all" || app.status === selectedApplicationStatus
  );

  // CSV Export utility function
  const exportApplicationsCSV = () => {
    try {
      const csvData = filteredApplications.map((app: ProcessedApplication) => ({
        "Applicant Name": app.applicant,
        "Project Name": app.project,
        "Status": app.status.replace(/_/g, ' '),
        "Score": `${app.score}%`,
        "Email": app.email || '',
        "Submitted Days Ago": app.submittedDays,
        "Description": (app.description || '').replace(/[",\n\r]/g, ' '), // Clean for CSV
        "Reviewer Notes": (app.reviewerNotes || []).join('; ').replace(/[",\n\r]/g, ' ')
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => 
            `"${String(row[header as keyof typeof row] ?? '').replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applications_${selectedApplicationStatus}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: `${csvData.length} application${csvData.length === 1 ? "" : "s"} exported to CSV.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "The applications could not be exported. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Application View Dialog Component
  const ApplicationViewDialog = ({ application }: { application: ProcessedApplication }) => {
    if (!application) return null;

    return (
      <Dialog open={!!viewingApplication} onOpenChange={() => setViewingApplication(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application details</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Application by {application.applicant}
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Applicant name</p>
                <p className="text-sm" data-testid="view-app-applicant-name">
                  {application.applicant}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Email</p>
                <p className="text-sm" data-testid="view-app-email">
                  {application.email || 'Not provided'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Project name</p>
                <p className="text-sm" data-testid="view-app-project-name">
                  {application.project}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Status</p>
                <ApplicationStatusBadge status={application.status} data-testid="view-app-status" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Score</p>
                <p className="font-display text-xl font-medium" data-testid="view-app-score">
                  {application.score}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Submitted</p>
                <p className="text-sm" data-testid="view-app-submitted">
                  {application.submittedDays} days ago
                </p>
              </div>
            </div>

            {/* Project Description */}
            {application.description && (
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Project description</p>
                <div className="rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap" data-testid="view-app-description">
                  {application.description}
                </div>
              </div>
            )}

            {/* Reviewer Notes */}
            {application.reviewerNotes && application.reviewerNotes.length > 0 && (
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">Reviewer notes</p>
                <div className="space-y-2">
                  {application.reviewerNotes.map((note: string, index: number) => (
                    <div 
                      key={index} 
                      className="rounded-md border bg-muted p-2 text-sm"
                      data-testid={`view-app-note-${index}`}
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setViewingApplication(null)}
              data-testid="button-close-application-view"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // User management form handling
  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "public_visitor",
    },
  });

  const inviteUserForm = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "public_visitor",
    },
  });

  // Reset and populate edit form when editing user changes
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editUserForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role,
    });
  };

  const handleEditUserSubmit = (data: EditUserFormData) => {
    if (!editingUser) return;
    updateUser.mutate({ id: editingUser.id, data });
  };

  const handleInviteUserSubmit = (data: InviteUserFormData) => {
    inviteUser.mutate(data, {
      onSuccess: () => {
        inviteUserForm.reset();
      }
    });
  };

  // Edit User Dialog Component
  const EditUserDialog = () => {
    if (!editingUser) return null;

    return (
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Update this person's details and role.
            </div>
          </DialogHeader>
          
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(handleEditUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="First name" 
                          {...field}
                          data-testid="input-edit-user-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Last name" 
                          {...field}
                          data-testid="input-edit-user-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="name@example.com" 
                          {...field}
                          data-testid="input-edit-user-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-user-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {humanize(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUser.isPending}
                  data-testid="button-submit-edit-user"
                >
                  {updateUser.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // Invite User Dialog Component  
  const InviteUserDialog = () => {
    return (
      <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Create an account for this person. If email is set up, they also receive an invitation to sign in.
            </div>
          </DialogHeader>
          
          <Form {...inviteUserForm}>
            <form onSubmit={inviteUserForm.handleSubmit(handleInviteUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={inviteUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="First name" 
                          {...field}
                          data-testid="input-invite-user-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={inviteUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Last name" 
                          {...field}
                          data-testid="input-invite-user-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={inviteUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="name@example.com" 
                          {...field}
                          data-testid="input-invite-user-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-user-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {humanize(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInviteUserOpen(false)}
                  data-testid="button-cancel-invite-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviteUser.isPending}
                  data-testid="button-submit-invite-user"
                >
                  {inviteUser.isPending ? "Sending..." : "Send invitation"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // View Mentor Dialog Component
  const ViewMentorDialog = () => {
    if (!viewingMentor) return null;

    const fullName = `${viewingMentor.firstName || ''} ${viewingMentor.lastName || ''}`.trim() || 'Unnamed mentor';

    return (
      <Dialog open={!!viewingMentor} onOpenChange={() => setViewingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mentor profile: {fullName}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Contact details and the profile participants see.
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-display text-sm text-muted-foreground">Name</label>
                <p className="text-sm" data-testid="mentor-name">{fullName}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">Email</label>
                <p className="text-sm" data-testid="mentor-email">{viewingMentor.email}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">Role</label>
                <p className="text-sm" data-testid="mentor-role">{humanize(viewingMentor.role)}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">Status</label>
                <p className="text-sm" data-testid="mentor-status">
                  {!viewingMentor.mentorProfile ? 'No profile yet' : viewingMentor.mentorProfile.isActive === false ? 'Inactive' : 'Active'}
                </p>
              </div>
            </div>

            {/* Mentor Profile Details */}
            {viewingMentor.mentorProfile && (
              <div className="space-y-4">
                <div>
                  <label className="font-display text-sm text-muted-foreground">Bio</label>
                  <p className="text-sm" data-testid="mentor-bio">
                    {viewingMentor.mentorProfile.bio || 'No bio provided'}
                  </p>
                </div>
                <div>
                  <label className="font-display text-sm text-muted-foreground">Expertise</label>
                  <p className="text-sm" data-testid="mentor-expertise">
                    {viewingMentor.mentorProfile.expertise?.join(', ') || 'No expertise listed'}
                  </p>
                </div>
                <div>
                  <label className="font-display text-sm text-muted-foreground">Industries</label>
                  <p className="text-sm" data-testid="mentor-industries">
                    {viewingMentor.mentorProfile.industries?.join(', ') || 'No industries listed'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setViewingMentor(null)}
              data-testid="button-close-view-mentor"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setViewingMentor(null);
                handleEditMentor(viewingMentor);
              }}
              data-testid="button-edit-mentor-from-view"
            >
              {viewingMentor.mentorProfile ? "Edit profile" : "Create profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Edit Mentor Profile Dialog Component
  const EditMentorDialog = () => {
    if (!editingMentor) return null;

    const fullName = `${editingMentor.firstName || ''} ${editingMentor.lastName || ''}`.trim() || 'Unnamed mentor';
    const isCreating = !editingMentor.mentorProfile;
    const isSaving = isCreating ? createMentorProfile.isPending : updateMentorProfile.isPending;

    return (
      <Dialog open={!!editingMentor} onOpenChange={() => setEditingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Create" : "Edit"} mentor profile: {fullName}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {isCreating
                ? "This mentor has no profile yet. Create one so participants can find and book them."
                : "Update the profile participants see when they book."}
            </div>
          </DialogHeader>
          
          <Form {...editMentorForm}>
            <form onSubmit={editMentorForm.handleSubmit(handleEditMentorSubmit)} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={editMentorForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="A short introduction for participants"
                        {...field}
                        data-testid="input-edit-mentor-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editMentorForm.control}
                name="expertise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expertise</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Fundraising, Product, Go-to-market"
                        {...field}
                        data-testid="input-edit-mentor-expertise"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Separate with commas</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editMentorForm.control}
                name="industries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industries</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Healthcare, Fintech"
                        {...field}
                        data-testid="input-edit-mentor-industries"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Separate with commas</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editMentorForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border p-4 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive mentors are hidden from participants.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        data-testid="input-edit-mentor-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end md:col-span-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingMentor(null)}
                  data-testid="button-cancel-edit-mentor"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  data-testid="button-submit-edit-mentor"
                >
                  {isSaving ? "Saving..." : isCreating ? "Create profile" : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // Check admin access (after all hooks so hook order stays stable)
  if (!isAdmin) {
    return (
      <AppLayout title="Admin" subtitle="Access restricted">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-10 h-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl mb-2">Administrators only</h3>
            <p className="text-muted-foreground">
              Your account doesn't have administrator access. If you need it, ask a Launchpad administrator.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Admin"
      subtitle="Manage applications, cohorts, program content and people for MD Genius Launchpad"
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="overflow-x-auto overflow-y-hidden">
            <TabsList className="flex w-max min-w-full flex-nowrap">
              <TabsTrigger value="overview" className="shrink-0" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="applications" className="shrink-0" data-testid="tab-applications">Applications</TabsTrigger>
              <TabsTrigger value="cohorts" className="shrink-0" data-testid="tab-cohorts">Cohorts</TabsTrigger>
              <TabsTrigger value="roadmap" className="shrink-0" data-testid="tab-roadmap">Roadmap</TabsTrigger>
              <TabsTrigger value="curriculum" className="shrink-0" data-testid="tab-curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="mentors" className="shrink-0" data-testid="tab-mentors">Mentors</TabsTrigger>
              <TabsTrigger value="investors" className="shrink-0" data-testid="tab-investors">Investors</TabsTrigger>
              <TabsTrigger value="users" className="shrink-0" data-testid="tab-users">Users</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">Total applications</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-total-applications">
                        {adminMetrics.totalApplications}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </div>
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">Acceptance rate</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-acceptance-rate">
                        {adminMetrics.acceptanceRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Of all applications</p>
                    </div>
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">Active projects</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-active-projects">
                        {adminMetrics.totalProjects}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Across {adminMetrics.activeCohorts} running cohort{adminMetrics.activeCohorts === 1 ? '' : 's'}</p>
                    </div>
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">Users</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-total-users">
                        {adminMetrics.totalUsers}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">All roles</p>
                    </div>
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications and System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent applications</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {recentApplications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No applications yet.</p>
                  )}
                  <div className="divide-y">
                    {recentApplications.slice(0, 5).map((application: ProcessedApplication) => (
                      <div key={application.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`application-name-${application.id}`}>
                            {application.applicant}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {application.project} · Score <span className="font-display">{application.score}%</span>
                          </p>
                          <ApplicationStatusBadge
                            status={application.status}
                            className="mt-1"
                            data-testid={`application-status-${application.id}`}
                          />
                        </div>
                        <ApplicationStatusDialog
                          application={application}
                          updateStatus={updateApplicationStatus}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Needs attention</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {systemAlerts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nothing needs attention right now.</p>
                    )}
                    {systemAlerts.map((alert: SystemAlert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "rounded-lg border p-4",
                          alert.type === 'warning' ? 'bg-warning/10 border-warning/20' :
                          alert.type === 'success' ? 'bg-success/10 border-success/20' :
                          'bg-secondary border-border'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {alert.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 text-warning mt-0.5" />}
                          {alert.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-success mt-0.5" />}
                          {alert.type === 'info' && <Clock className="w-4 h-4 shrink-0 text-accent mt-0.5" />}
                          <div>
                            <p className="font-display text-sm font-medium" data-testid={`alert-title-${alert.id}`}>
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`alert-message-${alert.id}`}>
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Applications</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-display">{filteredApplications.length}</span> application{filteredApplications.length === 1 ? '' : 's'}
                  </p>
                </div>
                {/* Application Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={selectedApplicationStatus} onValueChange={setSelectedApplicationStatus}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-application-status">
                      <SelectValue placeholder="Application status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All applications</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under review</SelectItem>
                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={exportApplicationsCSV}
                    disabled={filteredApplications.length === 0}
                    data-testid="button-export-applications"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>

              {/* Applications List */}
              <CardContent className="p-0">
                {filteredApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 border-t">No applications match this filter.</p>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((application: ProcessedApplication) => (
                        <TableRow key={application.id}>
                          <TableCell className="min-w-[10rem]">
                            <p className="font-medium" data-testid={`app-applicant-${application.id}`}>
                              {application.applicant}
                            </p>
                            {application.email && (
                              <p className="text-xs text-muted-foreground">{application.email}</p>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[10rem] text-muted-foreground">
                            {application.project}
                          </TableCell>
                          <TableCell>
                            <ApplicationStatusBadge
                              status={application.status}
                              className="whitespace-nowrap"
                              data-testid={`app-status-${application.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right font-display">
                            {application.score}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingApplication(application)}
                                data-testid={`button-view-app-${application.id}`}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>

                              <ApplicationStatusDialog
                                application={application}
                                updateStatus={updateApplicationStatus}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohorts" className="space-y-6">
            {/* Create Cohort */}
            <Card>
              <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Cohorts</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Applicants can only apply to active cohorts.
                  </p>
                </div>
                <Dialog open={isCreateCohortOpen} onOpenChange={setIsCreateCohortOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-cohort">
                      <Plus className="w-4 h-4 mr-2" />
                      Add cohort
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add cohort</DialogTitle>
                    </DialogHeader>
                    <Form {...cohortForm}>
                      <form onSubmit={cohortForm.handleSubmit((data) => createCohort.mutate(data))} className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={cohortForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cohort name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g., Spring Cohort"
                                  data-testid="input-cohort-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={cohortForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Capacity</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-cohort-capacity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={cohortForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="The cohort's focus and goals"
                                  data-testid="textarea-cohort-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={cohortForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start date</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  data-testid="input-cohort-start-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={cohortForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End date</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  data-testid="input-cohort-end-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end pt-2 md:col-span-2">
                          <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={createCohort.isPending}
                            data-testid="button-submit-cohort"
                          >
                            {createCohort.isPending ? "Creating..." : "Add cohort"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {cohortsLoading ? (
                  <BlockLoader label="Loading cohorts" className="py-8 border-t" />
                ) : cohorts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 border-t">No cohorts yet. Add one to open applications.</p>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cohort</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead className="text-right">Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cohorts.map((cohort: Cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell className="min-w-[14rem]">
                            <p className="font-display font-medium" data-testid={`cohort-name-${cohort.id}`}>
                              {cohort.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {cohort.description}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatCohortDate(cohort.startDate)} – {formatCohortDate(cohort.endDate)}
                          </TableCell>
                          <TableCell className="text-right font-display">{cohort.capacity}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={activeBadgeClass(!!cohort.isActive)}>
                              {cohort.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCohort(cohort)}
                                data-testid={`button-edit-cohort-${cohort.id}`}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCohortActive.mutate({ id: cohort.id, isActive: !cohort.isActive })}
                                disabled={setCohortActive.isPending}
                                data-testid={`button-toggle-cohort-${cohort.id}`}
                              >
                                {cohort.isActive ? "Deactivate" : "Reactivate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Program roadmap</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create and manage the roadmap templates assigned to participant projects.
                </p>
              </CardHeader>
              <CardContent>
                <AdminRoadmapManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <AdminCurriculumManager
                  selectedCohort={curriculumCohort}
                  onSelectedCohortChange={setCurriculumCohort}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mentors</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage mentor profiles and see who participants can book.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search mentors"
                    aria-label="Search mentors"
                    className="w-full sm:max-w-sm"
                    value={mentorSearch}
                    onChange={(e) => setMentorSearch(e.target.value)}
                    data-testid="input-search-mentors"
                  />
                  <Button
                    onClick={() => {
                      inviteUserForm.reset({ firstName: "", lastName: "", email: "", role: "mentor" });
                      setIsInviteUserOpen(true);
                    }}
                    data-testid="button-invite-mentor"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite mentor
                  </Button>
                </div>

                {mentorsLoading ? (
                  <BlockLoader label="Loading mentors" className="py-8 border-t" />
                ) : filteredMentors.length === 0 ? (
                  <div className="text-center py-8 border-t">
                    <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No mentors found.</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mentor</TableHead>
                        <TableHead>Expertise</TableHead>
                        <TableHead>Industries</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMentors.map((mentor) => {
                        const fullName = `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() || 'Unnamed mentor';
                        const initials = mentor.firstName && mentor.lastName
                          ? `${mentor.firstName[0]}${mentor.lastName[0]}`
                          : fullName.split(' ').map(n => n[0]).join('').slice(0, 2);

                        return (
                          <TableRow key={mentor.id}>
                            <TableCell className="min-w-[14rem]">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-medium text-primary">
                                  {initials.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium" data-testid={`mentor-name-${mentor.id}`}>
                                      {fullName}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {humanize(mentor.role)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {mentor.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[10rem]">
                              {mentor.mentorProfile ? (
                                mentor.mentorProfile.expertise?.join(', ') || <span className="text-muted-foreground">None listed</span>
                              ) : (
                                <span className="text-xs text-warning">
                                  No mentor profile yet, so participants can't see or book this mentor.
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[8rem] text-muted-foreground">
                              {mentor.mentorProfile ? (mentor.mentorProfile.industries?.join(', ') || 'None listed') : '—'}
                            </TableCell>
                            <TableCell>
                              {mentor.mentorProfile ? (
                                <Badge variant="outline" className={activeBadgeClass(mentor.mentorProfile.isActive !== false)}>
                                  {mentor.mentorProfile.isActive === false ? 'Inactive' : 'Active'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="whitespace-nowrap border-dashed border-steel/60 bg-transparent text-muted-foreground">
                                  No profile
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMentor(mentor)}
                                  aria-label="View mentor"
                                  title="View mentor"
                                  data-testid={`button-view-mentor-${mentor.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {mentor.mentorProfile ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMentor(mentor)}
                                    aria-label="Edit mentor"
                                    title="Edit mentor"
                                    data-testid={`button-edit-mentor-${mentor.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="whitespace-nowrap"
                                    onClick={() => handleEditMentor(mentor)}
                                    data-testid={`button-create-mentor-profile-${mentor.id}`}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Create profile
                                  </Button>
                                )}
                                {mentor.email && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-contact-mentor-${mentor.id}`}
                                  >
                                    <a href={`mailto:${mentor.email}`} aria-label={`Email ${fullName}`}>
                                      <Mail className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Mentor Sessions Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Recent sessions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Recent mentoring sessions across all cohorts.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <BlockLoader label="Loading sessions" className="py-6 border-t" />
                ) : recentSessions.length === 0 ? (
                  <div className="text-center py-6 border-t">
                    <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No recent sessions.</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead className="text-right">Participants</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="min-w-[10rem] font-medium">{session.title}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {" – "}
                            {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </TableCell>
                          <TableCell className="text-right font-display">
                            {session.participantIds?.length || 0}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={sessionBadgeClass(sessionStatus(session))}
                              data-testid={`session-status-${session.id}`}
                            >
                              {sessionStatus(session)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investors" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <AdminInvestorManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Everyone with a Launchpad account, across all roles.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search users"
                    aria-label="Search users"
                    className="w-full sm:max-w-sm"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    data-testid="input-search-users"
                  />
                  <Button
                    onClick={() => {
                      inviteUserForm.reset({ firstName: "", lastName: "", email: "", role: "public_visitor" });
                      setIsInviteUserOpen(true);
                    }}
                    data-testid="button-invite-user"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite user
                  </Button>
                </div>

                {usersLoading ? (
                  <BlockLoader label="Loading users" className="py-8 border-t" />
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 border-t">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No users found.</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed user';
                        const initials = user.firstName && user.lastName
                          ? `${user.firstName[0]}${user.lastName[0]}`
                          : fullName.split(' ').map(n => n[0]).join('').slice(0, 2);

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="min-w-[12rem]">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-medium text-primary">
                                  {initials.toUpperCase()}
                                </div>
                                <p className="font-medium" data-testid={`user-name-${user.id}`}>
                                  {fullName}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline">{humanize(user.role)}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email || '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(user)}
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                {user.email && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    data-testid={`button-message-user-${user.id}`}
                                  >
                                    <a href={`mailto:${user.email}`}>
                                      <Mail className="w-3 h-3 mr-1" />
                                      Email
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Application View Dialog */}
      {viewingApplication && (
        ApplicationViewDialog({ application: viewingApplication })
      )}

      {/* User Management Dialogs */}
      {EditUserDialog()}
      {InviteUserDialog()}

      {/* Mentor Management Dialogs */}
      {ViewMentorDialog()}
      {EditMentorDialog()}

      {/* Cohort Edit Dialog */}
      <Dialog open={!!editingCohort} onOpenChange={() => setEditingCohort(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit cohort</DialogTitle>
          </DialogHeader>
          <Form {...editCohortForm}>
            <form onSubmit={editCohortForm.handleSubmit((data) => updateCohort.mutate(data))} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={editCohortForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cohort name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Spring Cohort"
                        data-testid="input-edit-cohort-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCohortForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-edit-cohort-capacity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCohortForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="The cohort's focus and goals"
                        data-testid="textarea-edit-cohort-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCohortForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date"
                        data-testid="input-edit-cohort-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCohortForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date"
                        data-testid="input-edit-cohort-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end md:col-span-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingCohort(null)}
                  data-testid="button-cancel-edit-cohort"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCohort.isPending}
                  data-testid="button-submit-edit-cohort"
                >
                  {updateCohort.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
