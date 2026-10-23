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
        title: "Error",
        description: "Please select a status",
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
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Application Status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Application by {application.applicant} for {application.project}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Status</label>
            <p className="text-sm text-muted-foreground capitalize">
              {application.status.replace('_', ' ')}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium">New Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Reviewer Notes</label>
            <Textarea 
              placeholder="Add reviewer notes (optional)..."
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              data-testid={`textarea-reviewer-notes-${application.id}`}
            />
          </div>
          
          {application.reviewerNotes && application.reviewerNotes.length > 0 && (
            <div>
              <label className="text-sm font-medium">Previous Notes</label>
              <div className="space-y-1">
                {application.reviewerNotes.map((note: string, index: number) => (
                  <p key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}
          
          <Button 
            className="w-full"
            onClick={handleStatusUpdate}
            disabled={updateStatus.isPending || !selectedStatus}
            data-testid={`button-confirm-status-${application.id}`}
          >
            {updateStatus.isPending ? "Updating..." : "Update Status"}
          </Button>
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
        applicant: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User',
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
        title: "Applications Pending Review",
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
        title: "Active Cohorts",
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
        title: "New Participants",
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
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
    toast({
      title: "Error",
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
        title: variables.isActive ? "Cohort Reactivated" : "Cohort Deactivated",
        description: variables.isActive
          ? "The cohort is open to applicants again."
          : "The cohort is hidden from applicants.",
      });
      invalidateCohorts();
    },
    onError: (error) => handleMutationError(error, "Failed to update cohort. Please try again."),
  });

  // Create cohort mutation
  const createCohort = useMutation({
    mutationFn: async (data: CohortFormData) => {
      const response = await apiRequest("POST", "/api/admin/cohorts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cohort Created!",
        description: "New cohort has been created successfully.",
      });
      setIsCreateCohortOpen(false);
      invalidateCohorts();
      cohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create cohort. Please try again.",
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
        title: "Cohort Updated!",
        description: "Cohort has been updated successfully.",
      });
      invalidateCohorts();
      setEditingCohort(null);
      editCohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update cohort. Please try again.",
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
        title: "Mentor Profile Created!",
        description: "The mentor now appears to participants.",
      });
      setEditingMentor(null);
      editMentorForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => handleMutationError(error, "Failed to create mentor profile. Please try again."),
  });

  // Update mentor profile mutation
  const updateMentorProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditMentorProfileFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/mentors/${id}`, mentorProfilePayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mentor Profile Updated!",
        description: "Mentor profile has been updated successfully.",
      });
      setEditingMentor(null);
      editMentorForm.reset();
      // Invalidate mentor queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update mentor profile. Please try again.",
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
        title: "Application Updated!",
        description: "Application status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Accepting an application can change the applicant's role
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update application. Please try again.",
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
        title: "User Updated!",
        description: "User information has been updated successfully.",
      });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
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
          title: "User Invited!",
          description: "The invitation email has been sent.",
        });
      } else {
        toast({
          title: "User Created",
          description: "User created. Email is not configured, so no invite was sent.",
        });
      }
      setIsInviteUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
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
        : getApiErrorMessage(error, "Failed to invite user. Please try again.");

      toast({
        title: "Error",
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
        title: "Export Complete",
        description: `Exported ${csvData.length} applications to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export applications. Please try again.",
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
            <DialogTitle>Application Details</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Application by {application.applicant}
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Applicant Name</label>
                <p className="text-sm p-2 bg-muted rounded" data-testid="view-app-applicant-name">
                  {application.applicant}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-sm p-2 bg-muted rounded" data-testid="view-app-email">
                  {application.email || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <p className="text-sm p-2 bg-muted rounded" data-testid="view-app-project-name">
                  {application.project}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge 
                  variant={
                    application.status === 'interview' ? 'default' :
                    application.status === 'shortlisted' ? 'secondary' :
                    application.status === 'accepted' ? 'default' :
                    'outline'
                  }
                  className="mt-1"
                  data-testid="view-app-status"
                >
                  {application.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Score</label>
                <p className="text-sm p-2 bg-muted rounded" data-testid="view-app-score">
                  {application.score}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Submitted</label>
                <p className="text-sm p-2 bg-muted rounded" data-testid="view-app-submitted">
                  {application.submittedDays} days ago
                </p>
              </div>
            </div>

            {/* Project Description */}
            {application.description && (
              <div>
                <label className="text-sm font-medium">Project Description</label>
                <div className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap" data-testid="view-app-description">
                  {application.description}
                </div>
              </div>
            )}

            {/* Reviewer Notes */}
            {application.reviewerNotes && application.reviewerNotes.length > 0 && (
              <div>
                <label className="text-sm font-medium">Reviewer Notes</label>
                <div className="mt-1 space-y-2">
                  {application.reviewerNotes.map((note: string, index: number) => (
                    <div 
                      key={index} 
                      className="p-2 bg-muted rounded text-sm"
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
            <DialogTitle>Edit User</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Update user information and role
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
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter first name" 
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter last name" 
                          {...field}
                          data-testid="input-edit-user-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter email address" 
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
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
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
                  {updateUser.isPending ? "Updating..." : "Update User"}
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
            <DialogTitle>Invite New User</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Send an invitation to join the platform
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
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter first name" 
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter last name" 
                          {...field}
                          data-testid="input-invite-user-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={inviteUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter email address" 
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
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
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
                  {inviteUser.isPending ? "Inviting..." : "Send Invitation"}
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

    const fullName = `${viewingMentor.firstName || ''} ${viewingMentor.lastName || ''}`.trim() || 'Unnamed Mentor';

    return (
      <Dialog open={!!viewingMentor} onOpenChange={() => setViewingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mentor Profile - {fullName}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              View mentor information and profile details
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm" data-testid="mentor-name">{fullName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm" data-testid="mentor-email">{viewingMentor.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-sm" data-testid="mentor-role">{viewingMentor.role}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-sm" data-testid="mentor-status">
                  {!viewingMentor.mentorProfile ? 'No profile yet' : viewingMentor.mentorProfile.isActive === false ? 'Inactive' : 'Active'}
                </p>
              </div>
            </div>

            {/* Mentor Profile Details */}
            {viewingMentor.mentorProfile && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bio</label>
                  <p className="text-sm" data-testid="mentor-bio">
                    {viewingMentor.mentorProfile.bio || 'No bio provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expertise</label>
                  <p className="text-sm" data-testid="mentor-expertise">
                    {viewingMentor.mentorProfile.expertise?.join(', ') || 'No expertise listed'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Industries</label>
                  <p className="text-sm" data-testid="mentor-industries">
                    {viewingMentor.mentorProfile.industries?.join(', ') || 'No industries listed'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              {viewingMentor.mentorProfile ? "Edit Profile" : "Create Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Edit Mentor Profile Dialog Component
  const EditMentorDialog = () => {
    if (!editingMentor) return null;

    const fullName = `${editingMentor.firstName || ''} ${editingMentor.lastName || ''}`.trim() || 'Unnamed Mentor';
    const isCreating = !editingMentor.mentorProfile;
    const isSaving = isCreating ? createMentorProfile.isPending : updateMentorProfile.isPending;

    return (
      <Dialog open={!!editingMentor} onOpenChange={() => setEditingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Create" : "Edit"} Mentor Profile - {fullName}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {isCreating
                ? "This mentor has no profile yet. Create one so participants can find and book them."
                : "Update mentor profile information"}
            </div>
          </DialogHeader>
          
          <Form {...editMentorForm}>
            <form onSubmit={editMentorForm.handleSubmit(handleEditMentorSubmit)} className="space-y-4">
              <FormField
                control={editMentorForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Enter mentor bio"
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this mentor profile
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

              <div className="flex justify-end space-x-2 pt-4">
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
                  {isSaving ? "Saving..." : isCreating ? "Create Profile" : "Update Profile"}
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
      <AppLayout title="Admin Panel" subtitle="Access denied">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Admin Panel" 
      subtitle="Manage the MD Genius AI Launchpad platform"
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden flex-nowrap h-auto lg:grid lg:grid-cols-8">
            <TabsTrigger value="overview" className="shrink-0" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="applications" className="shrink-0" data-testid="tab-applications">Applications</TabsTrigger>
            <TabsTrigger value="cohorts" className="shrink-0" data-testid="tab-cohorts">Cohorts</TabsTrigger>
            <TabsTrigger value="roadmap" className="shrink-0" data-testid="tab-roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="curriculum" className="shrink-0" data-testid="tab-curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="mentors" className="shrink-0" data-testid="tab-mentors">Mentors</TabsTrigger>
            <TabsTrigger value="investors" className="shrink-0" data-testid="tab-investors">Investors</TabsTrigger>
            <TabsTrigger value="users" className="shrink-0" data-testid="tab-users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                      <p className="text-2xl font-bold" data-testid="metric-total-applications">
                        {adminMetrics.totalApplications}
                      </p>
                      <p className="text-xs text-green-400 mt-1">All time</p>
                    </div>
                    <FileText className="w-8 h-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Acceptance Rate</p>
                      <p className="text-2xl font-bold" data-testid="metric-acceptance-rate">
                        {adminMetrics.acceptanceRate}%
                      </p>
                      <p className="text-xs text-accent mt-1">Of all applications</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-accent opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                      <p className="text-2xl font-bold" data-testid="metric-active-projects">
                        {adminMetrics.totalProjects}
                      </p>
                      <p className="text-xs text-primary mt-1">Across {adminMetrics.activeCohorts} running cohort{adminMetrics.activeCohorts === 1 ? '' : 's'}</p>
                    </div>
                    <GraduationCap className="w-8 h-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Users</p>
                      <p className="text-2xl font-bold" data-testid="metric-total-users">
                        {adminMetrics.totalUsers}
                      </p>
                      <p className="text-xs text-green-400 mt-1">All roles</p>
                    </div>
                    <Users className="w-8 h-8 text-green-400 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications and System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentApplications.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No applications yet.</p>
                    )}
                    {recentApplications.slice(0, 5).map((application: ProcessedApplication) => (
                      <Card key={application.id} className="bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm" data-testid={`application-name-${application.id}`}>
                                {application.applicant}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {application.project} • Score: {application.score}%
                              </p>
                              <Badge 
                                variant={
                                  application.status === 'interview' ? 'default' :
                                  application.status === 'shortlisted' ? 'secondary' :
                                  'outline'
                                }
                                className="mt-1"
                                data-testid={`application-status-${application.id}`}
                              >
                                {application.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <ApplicationStatusDialog 
                              application={application} 
                              updateStatus={updateApplicationStatus}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemAlerts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nothing needs attention right now.</p>
                    )}
                    {systemAlerts.map((alert: SystemAlert) => (
                      <Card 
                        key={alert.id} 
                        className={`${
                          alert.type === 'warning' ? 'bg-yellow-400/10 border-yellow-400/20' :
                          alert.type === 'success' ? 'bg-green-400/10 border-green-400/20' :
                          'bg-primary/10 border-primary/20'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-2">
                            {alert.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />}
                            {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />}
                            {alert.type === 'info' && <Clock className="w-4 h-4 text-primary mt-0.5" />}
                            <div>
                              <p className="text-sm font-medium" data-testid={`alert-title-${alert.id}`}>
                                {alert.title}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`alert-message-${alert.id}`}>
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            {/* Application Filters */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedApplicationStatus} onValueChange={setSelectedApplicationStatus}>
                      <SelectTrigger className="w-48" data-testid="select-application-status">
                        <SelectValue placeholder="Application Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applications</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
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
                      Export
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {filteredApplications.length} applications
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Application Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredApplications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No applications match this filter.</p>
                  )}
                  {filteredApplications.map((application: ProcessedApplication) => (
                    <Card key={application.id} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="font-medium" data-testid={`app-applicant-${application.id}`}>
                                  {application.applicant}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {application.project}
                                </p>
                              </div>
                              <Badge 
                                variant={
                                  application.status === 'interview' ? 'default' :
                                  application.status === 'shortlisted' ? 'secondary' :
                                  'outline'
                                }
                                data-testid={`app-status-${application.id}`}
                              >
                                {application.status.replace('_', ' ')}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                Score: <span className="font-medium">{application.score}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohorts" className="space-y-6">
            {/* Create Cohort */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cohort Management</CardTitle>
                  <Dialog open={isCreateCohortOpen} onOpenChange={setIsCreateCohortOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-cohort">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Cohort
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Cohort</DialogTitle>
                      </DialogHeader>
                      <Form {...cohortForm}>
                        <form onSubmit={cohortForm.handleSubmit((data) => createCohort.mutate(data))} className="space-y-4">
                          <FormField
                            control={cohortForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cohort Name</FormLabel>
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
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field}
                                    placeholder="Describe the cohort focus and goals..."
                                    data-testid="textarea-cohort-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={cohortForm.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
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
                                  <FormLabel>End Date</FormLabel>
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
                          </div>
                          
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
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={createCohort.isPending}
                            data-testid="button-submit-cohort"
                          >
                            {createCohort.isPending ? "Creating..." : "Create Cohort"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cohortsLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading cohorts...</p>
                  ) : cohorts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No cohorts yet. Create one to open applications.</p>
                  ) : null}
                  {cohorts.map((cohort: Cohort) => (
                    <Card key={cohort.id} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold" data-testid={`cohort-name-${cohort.id}`}>
                              {cohort.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {cohort.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>
                                {formatCohortDate(cohort.startDate)} - {formatCohortDate(cohort.endDate)}
                              </span>
                              <span>Capacity: {cohort.capacity}</span>
                              <Badge variant={cohort.isActive ? "default" : "secondary"}>
                                {cohort.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Program Roadmap Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create and manage roadmap templates for participant programs
                </p>
              </CardHeader>
              <CardContent>
                <AdminRoadmapManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Curriculum Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage educational modules, lessons, and assessments for your accelerator program
                </p>
              </CardHeader>
              <CardContent>
                <AdminCurriculumManager
                  selectedCohort={curriculumCohort}
                  onSelectedCohortChange={setCurriculumCohort}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentors" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Mentor Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage mentor profiles, sessions, and program participation
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <Input
                    placeholder="Search mentors..."
                    className="max-w-sm"
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
                    Invite Mentor
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {mentorsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading mentors...</p>
                    </div>
                  ) : filteredMentors.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No mentors found</p>
                    </div>
                  ) : (
                    filteredMentors.map((mentor) => {
                      const fullName = `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() || 'Unnamed Mentor';
                      const initials = mentor.firstName && mentor.lastName 
                        ? `${mentor.firstName[0]}${mentor.lastName[0]}`
                        : fullName.split(' ').map(n => n[0]).join('').slice(0, 2);
                      
                      return (
                        <Card key={mentor.id} className="bg-secondary/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-semibold">
                                  {initials.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium" data-testid={`mentor-name-${mentor.id}`}>
                                      {fullName}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {mentor.role}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {mentor.email}
                                  </p>
                                  {!mentor.mentorProfile && (
                                    <p className="mt-2 text-xs text-yellow-400">
                                      No mentor profile yet, so participants can't see or book this mentor.
                                    </p>
                                  )}
                                  {mentor.mentorProfile && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-sm font-medium">
                                        {mentor.mentorProfile.expertise?.join(', ') || 'No expertise listed'}
                                      </p>
                                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                        <span className="flex items-center">
                                          <Star className="w-3 h-3 mr-1" />
                                          Industries: {mentor.mentorProfile.industries?.join(', ') || 'None listed'}
                                        </span>
                                        <span className="flex items-center">
                                          <MessageCircle className="w-3 h-3 mr-1" />
                                          {mentor.mentorProfile.isActive === false ? 'Inactive' : 'Active'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
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
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mentor Sessions Overview */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Overview of recent mentoring sessions across the platform
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2 text-sm">Loading sessions...</p>
                    </div>
                  ) : recentSessions.length === 0 ? (
                    <div className="text-center py-4">
                      <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No recent sessions</p>
                    </div>
                  ) : (
                    recentSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {" - "}
                            {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.participantIds?.length || 0} participant(s)
                          </p>
                        </div>
                        <Badge
                          variant={sessionStatus(session) === 'Completed' ? 'default' : 'outline'}
                          className="text-xs"
                          data-testid={`session-status-${session.id}`}
                        >
                          {sessionStatus(session)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investors" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Investor Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage investor profiles, sessions, and cohort participation
                </p>
              </CardHeader>
              <CardContent>
                <AdminInvestorManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <Input
                    placeholder="Search users..."
                    className="max-w-sm"
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
                    Invite User
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {usersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading users...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed User';
                      const initials = user.firstName && user.lastName 
                        ? `${user.firstName[0]}${user.lastName[0]}`
                        : fullName.split(' ').map(n => n[0]).join('').slice(0, 2);
                      
                      return (
                        <Card key={user.id} className="bg-secondary/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
                                  {initials.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium" data-testid={`user-name-${user.id}`}>
                                    {fullName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
                                  </p>
                                  {user.email && (
                                    <p className="text-xs text-muted-foreground">
                                      {user.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
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
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
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
            <DialogTitle>Edit Cohort</DialogTitle>
          </DialogHeader>
          <Form {...editCohortForm}>
            <form onSubmit={editCohortForm.handleSubmit((data) => updateCohort.mutate(data))} className="space-y-4">
              <FormField
                control={editCohortForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cohort Name</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Describe the cohort focus and goals..."
                        data-testid="textarea-edit-cohort-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editCohortForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
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
                      <FormLabel>End Date</FormLabel>
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
              </div>
              
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
              
              <div className="flex justify-end space-x-2">
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
                  {updateCohort.isPending ? "Updating..." : "Update Cohort"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
