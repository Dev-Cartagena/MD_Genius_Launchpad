import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { intlLocale, resources } from "@/i18n";
import { useLocalized } from "@/lib/localized";
import { useLanguage } from "@/hooks/useLanguage";
import { ContentLanguageTabs } from "@/components/ContentLanguageTabs";
import { LOCALES, type Locale } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { isCohortRunning, isCohortUpcoming } from "@/lib/cohorts";
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
import { useForm, type UseFormReturn } from "react-hook-form";
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
import ProgramSetupChecklist from "@/components/Admin/ProgramSetupChecklist";
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

type AdminT = TFunction<["admin", "common"]>;

// Schemas are built with `t` so validation messages follow the interface language.
const makeCohortSchema = (t: AdminT) => z.object({
  name: z.string().min(3, t("validation.cohortName")),
  description: z.string().min(10, t("validation.cohortDescription")),
  startDate: z.string().min(1, t("validation.startDate")),
  endDate: z.string().min(1, t("validation.endDate")),
  capacity: z.number().min(1, t("validation.capacity")),
  // Spanish version of the text fields (optional; empty fields fall back to English).
  translations: z.object({
    es: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
  }).optional(),
});

type CohortFormData = z.infer<ReturnType<typeof makeCohortSchema>>;

const emptyCohortTranslations = { es: { name: "", description: "" } };

// User management schemas
const userRoles = ["public_visitor", "applicant", "participant", "mentor", "investor", "administrator"] as const;

const makeEditUserSchema = (t: AdminT) => z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(t("validation.email")),
  role: z.enum(userRoles, { required_error: t("validation.role") }),
});

const makeInviteUserSchema = (t: AdminT) => z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(t("validation.email")),
  role: z.enum(userRoles, { required_error: t("validation.role") }),
  // Language for the invitation email and the new account.
  locale: z.enum(LOCALES),
});

type EditUserFormData = z.infer<ReturnType<typeof makeEditUserSchema>>;
type InviteUserFormData = z.infer<ReturnType<typeof makeInviteUserSchema>>;

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
// The returned value is internal (compared below); the label is translated where it's shown.
const sessionStatus = (session: { endTime?: string | Date | null }) =>
  session.endTime && new Date(session.endTime).getTime() < Date.now() ? "Completed" : "Upcoming";

type EditMentorProfileFormData = z.infer<typeof editMentorProfileSchema>;

// Sentence-case label for any snake_case value; fallback for values without a translation.
const humanize = (value?: string | null) => {
  const text = (value || "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

type ApplicationStatusKey = keyof (typeof resources)["en"]["common"]["applicationStatus"];
type RoleKey = keyof (typeof resources)["en"]["common"]["roles"];

// Stored values stay as they are; only the displayed label is translated.
const applicationStatusLabel = (t: AdminT, status?: string | null) =>
  status && status in resources.en.common.applicationStatus
    ? t(`common:applicationStatus.${status as ApplicationStatusKey}`)
    : humanize(status);

const roleLabel = (t: AdminT, role?: string | null) =>
  role && role in resources.en.common.roles ? t(`common:roles.${role as RoleKey}`) : humanize(role);

const reviewStatuses = ["submitted", "under_review", "shortlisted", "interview", "offer", "accepted", "rejected"] as const;
type ContentLang = "en" | "es";

/** The Spanish text stored on an entity, for prefilling the Spanish tab. */
function spanishOf(entity: { translations?: unknown } | null | undefined): Record<string, unknown> {
  const es = (entity?.translations as Record<string, unknown> | undefined)?.es;
  return es && typeof es === "object" ? (es as Record<string, unknown>) : {};
}

const textOr = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Cohort name and description for the create and edit dialogs, switched between
 * English (base, required) and Spanish (optional) by the content language tabs.
 */
function CohortTextFields({
  form,
  lang,
  onLangChange,
  testIdPrefix,
  children,
}: {
  form: UseFormReturn<CohortFormData>;
  lang: ContentLang;
  onLangChange: (lang: ContentLang) => void;
  /** "" for the create dialog, "edit-" for the edit dialog (keeps the existing test ids). */
  testIdPrefix: string;
  /** Shared, non-text fields rendered between the name and the description (capacity). */
  children?: ReactNode;
}) {
  const { t } = useTranslation(["admin", "common"]);
  const esName = form.watch("translations.es.name");
  const esDescription = form.watch("translations.es.description");
  const es = lang === "es";
  return (
    <>
      <ContentLanguageTabs
        className="md:col-span-2"
        value={lang}
        onChange={onLangChange}
        spanishMissing={!esName?.trim() && !esDescription?.trim()}
      />

      {!es ? (
        <FormField
          key="name-en"
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("cohorts.form.name")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("cohorts.form.namePlaceholder")}
                  data-testid={`input-${testIdPrefix}cohort-name`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="name-es"
          control={form.control}
          name="translations.es.name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("cohorts.form.name")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  lang="es"
                  placeholder={form.getValues("name") || t("cohorts.form.namePlaceholder")}
                  data-testid={`input-${testIdPrefix}cohort-name-es`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {children}

      {!es ? (
        <FormField
          key="description-en"
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t("shared.description")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t("cohorts.form.descriptionPlaceholder")}
                  data-testid={`textarea-${testIdPrefix}cohort-description`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="description-es"
          control={form.control}
          name="translations.es.description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t("shared.description")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  lang="es"
                  placeholder={form.getValues("description") || t("cohorts.form.descriptionPlaceholder")}
                  data-testid={`textarea-${testIdPrefix}cohort-description-es`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}

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
  const { t } = useTranslation(["admin", "common"]);
  return (
    <Badge variant="outline" className={cn(applicationStatusClass(status), className)} {...props}>
      {applicationStatusLabel(t, status)}
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
  const { t } = useTranslation(["admin", "common"]);
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = () => {
    if (!selectedStatus) {
      toast({
        title: t("applications.toast.selectStatusTitle"),
        description: t("applications.toast.selectStatusBody"),
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
          {t("applications.statusDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("applications.statusDialog.title")}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {t("applications.statusDialog.subtitle", { applicant: application.applicant, project: application.project })}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">{t("applications.statusDialog.currentStatus")}</label>
              <div>
                <ApplicationStatusBadge status={application.status} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">{t("applications.statusDialog.newStatus")}</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                  <SelectValue placeholder={t("applications.statusDialog.selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {reviewStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`common:applicationStatus.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="font-display text-sm font-medium">{t("applications.statusDialog.reviewerNotes")}</label>
            <Textarea 
              placeholder={t("applications.statusDialog.notesPlaceholder")}
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              data-testid={`textarea-reviewer-notes-${application.id}`}
            />
          </div>
          
          {application.reviewerNotes && application.reviewerNotes.length > 0 && (
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">{t("applications.statusDialog.previousNotes")}</label>
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
              {updateStatus.isPending ? t("applications.statusDialog.updating") : t("applications.statusDialog.trigger")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { t } = useTranslation(["admin", "common"]);
  const localized = useLocalized();
  const { language } = useLanguage();
  const [selectedTab, setSelectedTab] = useState("overview");
  // Lifted so the curriculum cohort selection survives switching admin tabs
  const [curriculumCohort, setCurriculumCohort] = useState<string | null>(null);
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState("all");
  const [viewingApplication, setViewingApplication] = useState<ProcessedApplication | null>(null);
  
  // User management state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isCreateCohortOpen, setIsCreateCohortOpen] = useState(false);
  // Content language shown in the cohort dialogs (English is the base text).
  const [cohortLang, setCohortLang] = useState<ContentLang>("en");
  const [editCohortLang, setEditCohortLang] = useState<ContentLang>("en");
  useEffect(() => {
    if (isCreateCohortOpen) setCohortLang("en");
  }, [isCreateCohortOpen]);
  
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
        applicant: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || t("applications.unknownUser")
          : t("applications.unknownUser"),
        project: getApplicationTitle(app.answers),
        status: app.status || 'draft',
        submittedDays: daysDiff,
        score: (app.scores as any)?.total || 0,
        email: user?.email,
        description: getApplicationDescription(app.answers),
        reviewerNotes: app.reviewerNotes || []
      };
    }).sort((a: ProcessedApplication, b: ProcessedApplication) => a.submittedDays - b.submittedDays); // Most recent first
  }, [applications, users, t]);

  // Generate dynamic system alerts from real data
  const systemAlerts = useMemo((): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    
    // Check for pending reviews
    const pendingReviews = applications.filter((app: Application) => app.status === 'submitted').length;
    if (pendingReviews > 0) {
      alerts.push({
        id: "pending-reviews",
        type: "warning",
        title: t("overview.alerts.pendingTitle"),
        message: t("overview.alerts.pending", { count: pendingReviews }),
        priority: pendingReviews > 5 ? "high" : "medium"
      });
    }
    
    // Check for active cohorts (same counts as cohortStatusMessage in lib/cohorts, translated here)
    const running = cohorts.filter((c) => isCohortRunning(c)).length;
    const upcoming = cohorts.filter((c) => isCohortUpcoming(c)).length;
    const ended = cohorts.filter((c) => c.isActive).length - running - upcoming;
    const cohortParts: string[] = [];
    if (running > 0) cohortParts.push(t("overview.alerts.running", { count: running }));
    if (upcoming > 0) cohortParts.push(t("overview.alerts.upcoming", { count: upcoming }));
    if (ended > 0) cohortParts.push(t("overview.alerts.ended", { count: ended }));
    if (cohortParts.length > 0) {
      alerts.push({
        id: "active-cohorts",
        type: "info",
        title: t("overview.alerts.cohortsTitle"),
        message: new Intl.ListFormat(intlLocale(), { style: "long", type: "conjunction" }).format(cohortParts),
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
        title: t("overview.alerts.acceptedTitle"),
        message: t("overview.alerts.accepted", { count: recentAccepted }),
        priority: "low"
      });
    }
    
    return alerts;
  }, [applications, cohorts, t]);

  const cohortSchema = useMemo(() => makeCohortSchema(t), [t]);
  const editUserSchema = useMemo(() => makeEditUserSchema(t), [t]);
  const inviteUserSchema = useMemo(() => makeInviteUserSchema(t), [t]);

  // Form for creating cohorts
  const cohortForm = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      capacity: 15,
      translations: emptyCohortTranslations,
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
      translations: emptyCohortTranslations,
    },
  });

  // English is required; if it fails validation while the Spanish tab is open, show it.
  const showEnglishOnError = (setLang: (lang: ContentLang) => void) => (errors: Record<string, unknown>) => {
    if (errors.name || errors.description) setLang("en");
  };

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
        title: t("shared.signedOutTitle"),
        description: t("shared.signedOutBody"),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
    toast({
      title: t("shared.errorTitle"),
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
        title: variables.isActive ? t("cohorts.toast.reactivatedTitle") : t("cohorts.toast.deactivatedTitle"),
        description: variables.isActive
          ? t("cohorts.toast.reactivatedBody")
          : t("cohorts.toast.deactivatedBody"),
      });
      invalidateCohorts();
    },
    onError: (error) => handleMutationError(error, t("cohorts.toast.updateFailed")),
  });

  // Create cohort mutation
  const createCohort = useMutation({
    mutationFn: async (data: CohortFormData) => {
      const response = await apiRequest("POST", "/api/admin/cohorts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("cohorts.toast.createdTitle"),
        description: t("cohorts.toast.createdBody"),
      });
      setIsCreateCohortOpen(false);
      invalidateCohorts();
      cohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("shared.errorTitle"),
        description: t("cohorts.toast.createFailed"),
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
        title: t("cohorts.toast.updatedTitle"),
        description: t("shared.changesSaved"),
      });
      invalidateCohorts();
      setEditingCohort(null);
      editCohortForm.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("shared.errorTitle"),
        description: t("cohorts.toast.updateFailed"),
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
        title: t("mentors.toast.createdTitle"),
        description: t("mentors.toast.createdBody"),
      });
      setEditingMentor(null);
      editMentorForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => handleMutationError(error, t("mentors.toast.createFailed")),
  });

  // Update mentor profile mutation
  const updateMentorProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditMentorProfileFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/mentors/${id}`, mentorProfilePayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("mentors.toast.updatedTitle"),
        description: t("shared.changesSaved"),
      });
      setEditingMentor(null);
      editMentorForm.reset();
      // Invalidate mentor queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("shared.errorTitle"),
        description: t("mentors.toast.updateFailed"),
        variant: "destructive",
      });
    }
  });

  // Handler for opening edit dialog
  const handleEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setEditCohortLang("en");
    const es = spanishOf(cohort);
    // Format dates to string format expected by the form
    const startDate = new Date(cohort.startDate).toISOString().split('T')[0];
    const endDate = new Date(cohort.endDate).toISOString().split('T')[0];
    
    editCohortForm.reset({
      name: cohort.name,
      description: cohort.description || "",
      startDate,
      endDate,
      capacity: cohort.capacity,
      translations: { es: { name: textOr(es.name), description: textOr(es.description) } },
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
        title: t("applications.toast.statusUpdatedTitle"),
        description: t("applications.toast.statusUpdatedBody"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Accepting an application can change the applicant's role
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("shared.errorTitle"),
        description: t("applications.toast.updateFailed"),
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
        title: t("users.toast.updatedTitle"),
        description: t("shared.changesSaved"),
      });
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("shared.errorTitle"),
        description: t("users.toast.updateFailed"),
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
          title: t("invite.toast.sentTitle"),
          description: t("invite.toast.sentBody"),
        });
      } else {
        toast({
          title: t("invite.toast.createdTitle"),
          description: t("invite.toast.createdBody"),
        });
      }
      setIsInviteUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("shared.signedOutTitle"),
          description: t("shared.signedOutBody"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      
      // The server tags this case with a stable code, whatever language its message is in.
      const errorMessage = error?.message?.includes("email_taken")
        ? t("invite.toast.exists")
        : getApiErrorMessage(error, t("invite.toast.failed"));

      toast({
        title: t("shared.errorTitle"),
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
      // Row keys are stable; only the header row is translated. Status is exported as stored.
      const columns = [
        "applicantName", "projectName", "status", "score", "email", "submittedDaysAgo", "description", "reviewerNotes",
      ] as const;
      const csvData = filteredApplications.map((app: ProcessedApplication) => ({
        applicantName: app.applicant,
        projectName: app.project,
        status: app.status.replace(/_/g, ' '),
        score: `${app.score}%`,
        email: app.email || '',
        submittedDaysAgo: app.submittedDays,
        description: (app.description || '').replace(/[",\n\r]/g, ' '), // Clean for CSV
        reviewerNotes: (app.reviewerNotes || []).join('; ').replace(/[",\n\r]/g, ' ')
      }));

      const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csvContent = [
        columns.map((column) => quote(t(`applications.csv.${column}`))).join(','),
        ...csvData.map(row => columns.map((column) => quote(row[column])).join(','))
      ].join('\n');

      // Byte-order mark so Excel reads accented headers ("Descripción") as UTF-8.
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applications_${selectedApplicationStatus}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t("applications.toast.exportReadyTitle"),
        description: t("applications.toast.exportReady", { count: csvData.length }),
      });
    } catch (error) {
      toast({
        title: t("applications.toast.exportFailedTitle"),
        description: t("applications.toast.exportFailedBody"),
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
            <DialogTitle>{t("applications.viewDialog.title")}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {t("applications.viewDialog.subtitle", { applicant: application.applicant })}
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.applicantName")}</p>
                <p className="text-sm" data-testid="view-app-applicant-name">
                  {application.applicant}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("shared.email")}</p>
                <p className="text-sm" data-testid="view-app-email">
                  {application.email || t("shared.notProvided")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.projectName")}</p>
                <p className="text-sm" data-testid="view-app-project-name">
                  {application.project}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("shared.status")}</p>
                <ApplicationStatusBadge status={application.status} data-testid="view-app-status" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.score")}</p>
                <p className="font-display text-xl font-medium" data-testid="view-app-score">
                  {application.score}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.submitted")}</p>
                <p className="text-sm" data-testid="view-app-submitted">
                  {t("applications.viewDialog.daysAgo", { count: application.submittedDays })}
                </p>
              </div>
            </div>

            {/* Project Description */}
            {application.description && (
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.projectDescription")}</p>
                <div className="rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap" data-testid="view-app-description">
                  {application.description}
                </div>
              </div>
            )}

            {/* Reviewer Notes */}
            {application.reviewerNotes && application.reviewerNotes.length > 0 && (
              <div className="space-y-1">
                <p className="font-display text-sm text-muted-foreground">{t("applications.viewDialog.reviewerNotes")}</p>
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
              {t("common:actions.close")}
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
      locale: language,
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
            <DialogTitle>{t("users.editDialog.title")}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {t("users.editDialog.subtitle")}
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
                      <FormLabel>{t("shared.firstName")}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t("shared.firstName")} 
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
                      <FormLabel>{t("shared.lastName")}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t("shared.lastName")} 
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
                      <FormLabel>{t("shared.emailAddress")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder={t("shared.emailPlaceholder")} 
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
                      <FormLabel>{t("shared.role")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-user-role">
                            <SelectValue placeholder={t("shared.selectRole")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabel(t, role)}
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
                  {t("common:actions.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUser.isPending}
                  data-testid="button-submit-edit-user"
                >
                  {updateUser.isPending ? t("shared.saving") : t("common:actions.saveChanges")}
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
            <DialogTitle>{t("invite.title")}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {t("invite.subtitle")}
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
                      <FormLabel>{t("shared.firstName")}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t("shared.firstName")} 
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
                      <FormLabel>{t("shared.lastName")}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t("shared.lastName")} 
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
                      <FormLabel>{t("shared.emailAddress")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder={t("shared.emailPlaceholder")} 
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
                      <FormLabel>{t("shared.role")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-user-role">
                            <SelectValue placeholder={t("shared.selectRole")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabel(t, role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={inviteUserForm.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("invite.language.label")}</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value as Locale)} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="md:w-1/2" data-testid="select-invite-user-locale">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCALES.map((locale) => (
                          <SelectItem key={locale} value={locale} lang={locale}>
                            {t(`invite.language.${locale}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("invite.language.hint")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInviteUserOpen(false)}
                  data-testid="button-cancel-invite-user"
                >
                  {t("common:actions.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviteUser.isPending}
                  data-testid="button-submit-invite-user"
                >
                  {inviteUser.isPending ? t("invite.sending") : t("invite.send")}
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

    const fullName = `${viewingMentor.firstName || ''} ${viewingMentor.lastName || ''}`.trim() || t("mentors.unnamed");

    return (
      <Dialog open={!!viewingMentor} onOpenChange={() => setViewingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("mentors.viewDialog.title", { name: fullName })}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {t("mentors.viewDialog.subtitle")}
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-display text-sm text-muted-foreground">{t("mentors.viewDialog.name")}</label>
                <p className="text-sm" data-testid="mentor-name">{fullName}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">{t("shared.email")}</label>
                <p className="text-sm" data-testid="mentor-email">{viewingMentor.email}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">{t("shared.role")}</label>
                <p className="text-sm" data-testid="mentor-role">{roleLabel(t, viewingMentor.role)}</p>
              </div>
              <div>
                <label className="font-display text-sm text-muted-foreground">{t("shared.status")}</label>
                <p className="text-sm" data-testid="mentor-status">
                  {!viewingMentor.mentorProfile
                    ? t("mentors.viewDialog.noProfileYet")
                    : viewingMentor.mentorProfile.isActive === false
                      ? t("shared.inactive")
                      : t("shared.active")}
                </p>
              </div>
            </div>

            {/* Mentor Profile Details */}
            {viewingMentor.mentorProfile && (
              <div className="space-y-4">
                <div>
                  <label className="font-display text-sm text-muted-foreground">{t("mentors.viewDialog.bio")}</label>
                  <p className="text-sm" data-testid="mentor-bio">
                    {viewingMentor.mentorProfile.bio || t("mentors.viewDialog.noBio")}
                  </p>
                </div>
                <div>
                  <label className="font-display text-sm text-muted-foreground">{t("mentors.viewDialog.expertise")}</label>
                  <p className="text-sm" data-testid="mentor-expertise">
                    {viewingMentor.mentorProfile.expertise?.join(', ') || t("mentors.viewDialog.noExpertise")}
                  </p>
                </div>
                <div>
                  <label className="font-display text-sm text-muted-foreground">{t("mentors.viewDialog.industries")}</label>
                  <p className="text-sm" data-testid="mentor-industries">
                    {viewingMentor.mentorProfile.industries?.join(', ') || t("mentors.viewDialog.noIndustries")}
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
              {t("common:actions.close")}
            </Button>
            <Button 
              onClick={() => {
                setViewingMentor(null);
                handleEditMentor(viewingMentor);
              }}
              data-testid="button-edit-mentor-from-view"
            >
              {viewingMentor.mentorProfile ? t("mentors.editProfile") : t("mentors.createProfile")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Edit Mentor Profile Dialog Component
  const EditMentorDialog = () => {
    if (!editingMentor) return null;

    const fullName = `${editingMentor.firstName || ''} ${editingMentor.lastName || ''}`.trim() || t("mentors.unnamed");
    const isCreating = !editingMentor.mentorProfile;
    const isSaving = isCreating ? createMentorProfile.isPending : updateMentorProfile.isPending;

    return (
      <Dialog open={!!editingMentor} onOpenChange={() => setEditingMentor(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating
                ? t("mentors.editDialog.createTitle", { name: fullName })
                : t("mentors.editDialog.editTitle", { name: fullName })}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {isCreating ? t("mentors.editDialog.createBody") : t("mentors.editDialog.editBody")}
            </div>
          </DialogHeader>
          
          <Form {...editMentorForm}>
            <form onSubmit={editMentorForm.handleSubmit(handleEditMentorSubmit)} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={editMentorForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("mentors.editDialog.bio")}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder={t("mentors.editDialog.bioPlaceholder")}
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
                    <FormLabel>{t("mentors.editDialog.expertise")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("mentors.editDialog.expertisePlaceholder")}
                        {...field}
                        data-testid="input-edit-mentor-expertise"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("shared.separateWithCommas")}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editMentorForm.control}
                name="industries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mentors.editDialog.industries")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("mentors.editDialog.industriesPlaceholder")}
                        {...field}
                        data-testid="input-edit-mentor-industries"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t("shared.separateWithCommas")}</p>
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
                      <FormLabel>{t("mentors.editDialog.active")}</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t("mentors.editDialog.activeHint")}
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
                  {t("common:actions.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  data-testid="button-submit-edit-mentor"
                >
                  {isSaving ? t("shared.saving") : isCreating ? t("mentors.createProfile") : t("common:actions.saveChanges")}
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
      <AppLayout title={t("page.title")} subtitle={t("page.restrictedSubtitle")}>
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-10 h-10 mx-auto text-primary mb-4" />
            <h3 className="text-xl mb-2">{t("page.restrictedTitle")}</h3>
            <p className="text-muted-foreground">
              {t("page.restrictedBody")}
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={t("page.title")}
      subtitle={t("page.subtitle")}
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div className="overflow-x-auto overflow-y-hidden">
            <TabsList className="flex w-max min-w-full flex-nowrap">
              <TabsTrigger value="overview" className="shrink-0" data-testid="tab-overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="applications" className="shrink-0" data-testid="tab-applications">{t("tabs.applications")}</TabsTrigger>
              <TabsTrigger value="cohorts" className="shrink-0" data-testid="tab-cohorts">{t("tabs.cohorts")}</TabsTrigger>
              <TabsTrigger value="roadmap" className="shrink-0" data-testid="tab-roadmap">{t("tabs.roadmap")}</TabsTrigger>
              <TabsTrigger value="curriculum" className="shrink-0" data-testid="tab-curriculum">{t("tabs.curriculum")}</TabsTrigger>
              <TabsTrigger value="mentors" className="shrink-0" data-testid="tab-mentors">{t("tabs.mentors")}</TabsTrigger>
              <TabsTrigger value="investors" className="shrink-0" data-testid="tab-investors">{t("tabs.investors")}</TabsTrigger>
              <TabsTrigger value="users" className="shrink-0" data-testid="tab-users">{t("tabs.users")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <ProgramSetupChecklist
              cohortCount={cohorts.length}
              mentorCount={users.filter((u) => u.role === "mentor").length}
              onGo={(target) => {
                if (target === "cohort") {
                  setSelectedTab("cohorts");
                  setIsCreateCohortOpen(true);
                } else {
                  setSelectedTab(target);
                }
              }}
            />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">{t("overview.metrics.totalApplications")}</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-total-applications">
                        {adminMetrics.totalApplications}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("overview.metrics.allTime")}</p>
                    </div>
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">{t("overview.metrics.acceptanceRate")}</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-acceptance-rate">
                        {adminMetrics.acceptanceRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("overview.metrics.ofAllApplications")}</p>
                    </div>
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">{t("overview.metrics.activeProjects")}</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-active-projects">
                        {adminMetrics.totalProjects}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("overview.metrics.acrossCohorts", { count: adminMetrics.activeCohorts })}</p>
                    </div>
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm text-muted-foreground">{t("overview.metrics.users")}</p>
                      <p className="mt-1 font-display text-3xl font-medium" data-testid="metric-total-users">
                        {adminMetrics.totalUsers}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t("overview.metrics.allRoles")}</p>
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
                  <CardTitle>{t("overview.recentApplications")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {recentApplications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t("overview.noApplications")}</p>
                  )}
                  <div className="divide-y">
                    {recentApplications.slice(0, 5).map((application: ProcessedApplication) => (
                      <div key={application.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`application-name-${application.id}`}>
                            {application.applicant}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {application.project} · {t("overview.score")} <span className="font-display">{application.score}%</span>
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
                  <CardTitle>{t("overview.needsAttention")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {systemAlerts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("overview.nothingNeedsAttention")}</p>
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
                  <CardTitle>{t("applications.title")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Trans
                      t={t}
                      i18nKey="applications.count"
                      count={filteredApplications.length}
                      components={{ num: <span className="font-display" /> }}
                    />
                  </p>
                </div>
                {/* Application Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={selectedApplicationStatus} onValueChange={setSelectedApplicationStatus}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-application-status">
                      <SelectValue placeholder={t("applications.filterPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("applications.all")}</SelectItem>
                      {reviewStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`common:applicationStatus.${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={exportApplicationsCSV}
                    disabled={filteredApplications.length === 0}
                    data-testid="button-export-applications"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("applications.exportCsv")}
                  </Button>
                </div>
              </CardHeader>

              {/* Applications List */}
              <CardContent className="p-0">
                {filteredApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 border-t">{t("applications.noMatch")}</p>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("applications.columns.applicant")}</TableHead>
                        <TableHead>{t("applications.columns.project")}</TableHead>
                        <TableHead>{t("shared.status")}</TableHead>
                        <TableHead className="text-right">{t("applications.columns.score")}</TableHead>
                        <TableHead className="text-right">{t("shared.actions")}</TableHead>
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
                                {t("shared.view")}
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
                  <CardTitle>{t("cohorts.title")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cohorts.subtitle")}
                  </p>
                </div>
                <Dialog open={isCreateCohortOpen} onOpenChange={setIsCreateCohortOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-cohort">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("cohorts.add")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("cohorts.add")}</DialogTitle>
                    </DialogHeader>
                    <Form {...cohortForm}>
                      <form
                        onSubmit={cohortForm.handleSubmit(
                          (data) => createCohort.mutate(data),
                          showEnglishOnError(setCohortLang),
                        )}
                        className="grid gap-4 md:grid-cols-2"
                      >
                        <CohortTextFields form={cohortForm} lang={cohortLang} onLangChange={setCohortLang} testIdPrefix="">
                          <FormField
                            control={cohortForm.control}
                            name="capacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("cohorts.form.capacity")}</FormLabel>
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
                        </CohortTextFields>

                        <FormField
                          control={cohortForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("cohorts.form.startDate")}</FormLabel>
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
                              <FormLabel>{t("cohorts.form.endDate")}</FormLabel>
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
                            {createCohort.isPending ? t("cohorts.creating") : t("cohorts.add")}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {cohortsLoading ? (
                  <BlockLoader label={t("cohorts.loading")} className="py-8 border-t" />
                ) : cohorts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 border-t">{t("cohorts.empty")}</p>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("cohorts.columns.cohort")}</TableHead>
                        <TableHead>{t("cohorts.columns.dates")}</TableHead>
                        <TableHead className="text-right">{t("cohorts.columns.capacity")}</TableHead>
                        <TableHead>{t("shared.status")}</TableHead>
                        <TableHead className="text-right">{t("shared.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cohorts.map((cohort: Cohort) => (
                        <TableRow key={cohort.id}>
                          <TableCell className="min-w-[14rem]">
                            <p className="font-display font-medium" data-testid={`cohort-name-${cohort.id}`}>
                              {localized.text(cohort, "name")}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {localized.text(cohort, "description")}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {t("common:dateRange", { start: formatCohortDate(cohort.startDate), end: formatCohortDate(cohort.endDate) })}
                          </TableCell>
                          <TableCell className="text-right font-display">{cohort.capacity}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={activeBadgeClass(!!cohort.isActive)}>
                              {cohort.isActive ? t("cohorts.active") : t("cohorts.inactive")}
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
                                {t("common:actions.edit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCohortActive.mutate({ id: cohort.id, isActive: !cohort.isActive })}
                                disabled={setCohortActive.isPending}
                                data-testid={`button-toggle-cohort-${cohort.id}`}
                              >
                                {cohort.isActive ? t("cohorts.deactivate") : t("cohorts.reactivate")}
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
                <CardTitle>{t("roadmap.tab.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("roadmap.tab.description")}
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
                  onRequestCreateCohort={() => {
                    setSelectedTab("cohorts");
                    setIsCreateCohortOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("mentors.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("mentors.description")}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder={t("mentors.search")}
                    aria-label={t("mentors.search")}
                    className="w-full sm:max-w-sm"
                    value={mentorSearch}
                    onChange={(e) => setMentorSearch(e.target.value)}
                    data-testid="input-search-mentors"
                  />
                  <Button
                    onClick={() => {
                      inviteUserForm.reset({ firstName: "", lastName: "", email: "", role: "mentor", locale: language });
                      setIsInviteUserOpen(true);
                    }}
                    data-testid="button-invite-mentor"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("mentors.invite")}
                  </Button>
                </div>

                {mentorsLoading ? (
                  <BlockLoader label={t("mentors.loading")} className="py-8 border-t" />
                ) : filteredMentors.length === 0 ? (
                  <div className="text-center py-8 border-t">
                    <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("mentors.empty")}</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("mentors.columns.mentor")}</TableHead>
                        <TableHead>{t("mentors.columns.expertise")}</TableHead>
                        <TableHead>{t("mentors.columns.industries")}</TableHead>
                        <TableHead>{t("shared.status")}</TableHead>
                        <TableHead className="text-right">{t("shared.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMentors.map((mentor) => {
                        const fullName = `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() || t("mentors.unnamed");
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
                                      {roleLabel(t, mentor.role)}
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
                                mentor.mentorProfile.expertise?.join(', ') || <span className="text-muted-foreground">{t("shared.noneListed")}</span>
                              ) : (
                                <span className="text-xs text-warning">
                                  {t("mentors.noProfileWarning")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[8rem] text-muted-foreground">
                              {mentor.mentorProfile ? (mentor.mentorProfile.industries?.join(', ') || t("shared.noneListed")) : '—'}
                            </TableCell>
                            <TableCell>
                              {mentor.mentorProfile ? (
                                <Badge variant="outline" className={activeBadgeClass(mentor.mentorProfile.isActive !== false)}>
                                  {mentor.mentorProfile.isActive === false ? t("shared.inactive") : t("shared.active")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="whitespace-nowrap border-dashed border-steel/60 bg-transparent text-muted-foreground">
                                  {t("mentors.noProfile")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMentor(mentor)}
                                  aria-label={t("mentors.viewMentor")}
                                  title={t("mentors.viewMentor")}
                                  data-testid={`button-view-mentor-${mentor.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {mentor.mentorProfile ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMentor(mentor)}
                                    aria-label={t("mentors.editMentor")}
                                    title={t("mentors.editMentor")}
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
                                    {t("mentors.createProfile")}
                                  </Button>
                                )}
                                {mentor.email && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    data-testid={`button-contact-mentor-${mentor.id}`}
                                  >
                                    <a href={`mailto:${mentor.email}`} aria-label={t("mentors.emailName", { name: fullName })}>
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
                <CardTitle>{t("mentors.sessions.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("mentors.sessions.description")}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {sessionsLoading ? (
                  <BlockLoader label={t("mentors.sessions.loading")} className="py-6 border-t" />
                ) : recentSessions.length === 0 ? (
                  <div className="text-center py-6 border-t">
                    <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">{t("mentors.sessions.empty")}</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("mentors.sessions.columns.session")}</TableHead>
                        <TableHead>{t("mentors.sessions.columns.when")}</TableHead>
                        <TableHead className="text-right">{t("mentors.sessions.columns.participants")}</TableHead>
                        <TableHead>{t("shared.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="min-w-[10rem] font-medium">{session.title}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {t("mentors.sessions.when", {
                              date: new Date(session.startTime).toLocaleDateString(intlLocale()),
                              start: new Date(session.startTime).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }),
                              end: new Date(session.endTime).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }),
                            })}
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
                              {sessionStatus(session) === "Completed"
                                ? t("mentors.sessions.status.completed")
                                : t("mentors.sessions.status.upcoming")}
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
                <CardTitle>{t("users.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("users.description")}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder={t("users.search")}
                    aria-label={t("users.search")}
                    className="w-full sm:max-w-sm"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    data-testid="input-search-users"
                  />
                  <Button
                    onClick={() => {
                      inviteUserForm.reset({ firstName: "", lastName: "", email: "", role: "public_visitor", locale: language });
                      setIsInviteUserOpen(true);
                    }}
                    data-testid="button-invite-user"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("users.invite")}
                  </Button>
                </div>

                {usersLoading ? (
                  <BlockLoader label={t("users.loading")} className="py-8 border-t" />
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 border-t">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t("users.empty")}</p>
                  </div>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("users.columns.name")}</TableHead>
                        <TableHead>{t("shared.role")}</TableHead>
                        <TableHead>{t("shared.email")}</TableHead>
                        <TableHead className="text-right">{t("shared.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || t("users.unnamed");
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
                              <Badge variant="outline">{roleLabel(t, user.role)}</Badge>
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
                                  {t("common:actions.edit")}
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
                                      {t("shared.email")}
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
            <DialogTitle>{t("cohorts.editTitle")}</DialogTitle>
          </DialogHeader>
          <Form {...editCohortForm}>
            <form
              onSubmit={editCohortForm.handleSubmit(
                (data) => updateCohort.mutate(data),
                showEnglishOnError(setEditCohortLang),
              )}
              className="grid gap-4 md:grid-cols-2"
            >
              <CohortTextFields
                form={editCohortForm}
                lang={editCohortLang}
                onLangChange={setEditCohortLang}
                testIdPrefix="edit-"
              >
                <FormField
                  control={editCohortForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cohorts.form.capacity")}</FormLabel>
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
              </CohortTextFields>

              <FormField
                control={editCohortForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cohorts.form.startDate")}</FormLabel>
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
                    <FormLabel>{t("cohorts.form.endDate")}</FormLabel>
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
                  {t("common:actions.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCohort.isPending}
                  data-testid="button-submit-edit-cohort"
                >
                  {updateCohort.isPending ? t("shared.saving") : t("common:actions.saveChanges")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
