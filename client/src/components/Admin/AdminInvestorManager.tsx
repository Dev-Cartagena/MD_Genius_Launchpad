import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getApiErrorMessage } from "@/lib/utils";
import { formatCohortDate } from "@/lib/dates";
import type { 
  Investor, 
  InvestorInterest,
  User,
  InvestorSession, 
  InvestorCohortParticipation, 
  Cohort,
  InsertInvestor,
  InsertInvestorSession,
  InsertInvestorCohortParticipation
} from "@shared/schema";
import { 
  insertInvestorSchema, 
  insertInvestorSessionSchema, 
  insertInvestorCohortParticipationSchema 
} from "@shared/schema";

// UI Components
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  Users, 
  Building, 
  Mail, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  Star,
  Video,
  MessageCircle,
  RotateCcw,
  TrendingUp
} from "lucide-react";

// Form schemas - extending shared schemas with UI-specific validation
const investorFormSchema = insertInvestorSchema.extend({
  sectors: z.array(z.string()).min(1, "At least one sector is required"),
  stages: z.array(z.string()).min(1, "At least one stage is required"),
  geography: z.array(z.string()).min(1, "At least one geography is required"),
  organization: z.string().min(1, "Organization name is required"),
  contactEmail: z.string().email("Valid email is required"),
  checkSize: z.string().min(1, "Check size is required"),
  ndaStatus: z.boolean().default(false),
  userId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

const sessionFormSchema = insertInvestorSessionSchema.extend({
  investorId: z.string().min(1, "Investor is required"),
  title: z.string().min(1, "Session title is required"),
  sessionType: z.string().min(1, "Session type is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  participantIds: z.array(z.string()).default([]),
});

const cohortAssignmentSchema = insertInvestorCohortParticipationSchema.extend({
  investorId: z.string().min(1, "Investor is required"),
  cohortId: z.string().min(1, "Cohort is required"),
  role: z.string().min(1, "Role is required"),
});

type InvestorFormData = z.infer<typeof investorFormSchema>;
type SessionFormData = z.infer<typeof sessionFormSchema>;
type CohortAssignmentData = z.infer<typeof cohortAssignmentSchema>;

const interestLevelOptions = [
  "viewed", "requested_info", "meeting_scheduled", "diligence", "soft_commit", "commit"
] as const;

type InterestLevel = typeof interestLevelOptions[number];

// Badge tone per pipeline level: early = neutral, in progress = Steel, committed = Navy
const interestLevelClass = (level: string | null | undefined) => {
  switch (level) {
    case "meeting_scheduled":
    case "diligence":
      return "border-transparent bg-accent text-accent-foreground";
    case "soft_commit":
    case "commit":
      return "border-transparent bg-primary text-primary-foreground";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
};

const formatLevel = (level: string | null | undefined) =>
  (level || "viewed").replace(/_/g, " ").replace(/^\w/, (l) => l.toUpperCase());

type AdminProject = { id: string; name: string; cohortId: string | null; ownerId: string };
type AdminInterest = InvestorInterest & { projectName?: string };

// Radix Select items can't use an empty value, so "no linked user" uses a sentinel
const NO_USER = "__none__";

// Pre-defined options
const sectorOptions = [
  "Healthcare", "Fintech", "EdTech", "E-commerce", "SaaS", "Cybersecurity",
  "Climate Tech", "Web3/Blockchain", "Robotics", "IoT", "Gaming", "Media & Entertainment", "AI/Machine Learning"
];

const stageOptions = [
  "Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth", "Late Stage"
];

const geographyOptions = [
  "North America", "Europe", "Asia-Pacific", "Latin America", "Middle East", "Africa", "Global"
];

const checkSizeOptions = [
  "$10K - $50K", "$50K - $100K", "$100K - $500K", "$500K - $1M", "$1M - $5M", "$5M+"
];

const sessionTypeOptions = [
  "pitch", "feedback", "due_diligence", "demo_day"
];

const investorRoleOptions = [
  "advisor", "judge", "funding_partner", "demo_day_evaluator"
];

// Helper function to generate time slots
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      slots.push({ value: time, label });
    }
  }
  return slots;
};

// Helper function to generate date options for next 30 days
const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const value = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    dates.push({ value, label });
  }
  return dates;
};

const timeSlots = generateTimeSlots();
const dateOptions = generateDateOptions();

export default function AdminInvestorManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [isCreateInvestorOpen, setIsCreateInvestorOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isAssignCohortOpen, setIsAssignCohortOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [isCreateInterestOpen, setIsCreateInterestOpen] = useState(false);
  const [newInterest, setNewInterest] = useState<{ investorId: string; projectId: string; level: InterestLevel; notes: string }>({
    investorId: "", projectId: "", level: "viewed", notes: "",
  });
  const [editingInterest, setEditingInterest] = useState<AdminInterest | null>(null);
  const [editInterestLevel, setEditInterestLevel] = useState<InterestLevel>("viewed");
  const [editInterestNotes, setEditInterestNotes] = useState("");

  // Queries
  const { data: investors = [], isLoading: investorsLoading } = useQuery<Investor[]>({
    queryKey: ["/api/admin/investors"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<InvestorSession[]>({
    queryKey: ["/api/admin/investor-sessions"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/admin/cohorts"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: projects = [] } = useQuery<AdminProject[]>({
    queryKey: ["/api/admin/projects"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });
  const investorUsers = useMemo(() => allUsers.filter((u) => u.role === "investor"), [allUsers]);

  const { data: interests = [], isLoading: interestsLoading } = useQuery<AdminInterest[]>({
    queryKey: ["/api/admin/investor-interests"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: cohortAssignments = [], isLoading: assignmentsLoading } = useQuery<InvestorCohortParticipation[]>({
    queryKey: ["/api/admin/cohort-assignments"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Mutations
  const createInvestorMutation = useMutation({
    mutationFn: async (data: InvestorFormData) => {
      const response = await apiRequest("POST", "/api/admin/investors", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateInvestorOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Investor added" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvestorFormData> }) => {
      const response = await apiRequest("PUT", `/api/admin/investors/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingInvestor(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Investor updated" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const deactivateInvestorMutation = useMutation({
    mutationFn: async (id: string) => {
      // Returns 204 with no body
      await apiRequest("DELETE", `/api/admin/investors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Investor deactivated" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const reactivateInvestorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/admin/investors/${id}`, { isActive: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Investor reactivated" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const createInterestMutation = useMutation({
    mutationFn: async (data: { investorId: string; projectId: string; level: InterestLevel; notes: string }) => {
      const response = await apiRequest("POST", "/api/admin/investor-interests", {
        investorId: data.investorId,
        projectId: data.projectId,
        level: data.level,
        ...(data.notes.trim() ? { notes: data.notes.trim() } : {}),
      });
      return response.json();
    },
    onSuccess: () => {
      setIsCreateInterestOpen(false);
      setNewInterest({ investorId: "", projectId: "", level: "viewed", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-interests"] });
      toast({ title: "Interest saved" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const updateInterestMutation = useMutation({
    mutationFn: async ({ id, level, notes }: { id: string; level: InterestLevel; notes: string }) => {
      const response = await apiRequest("PUT", `/api/admin/investor-interests/${id}`, {
        level,
        notes: notes.trim() ? notes.trim() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      setEditingInterest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-interests"] });
      toast({ title: "Interest updated" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      // Form values are local "YYYY-MM-DDTHH:mm" strings; the API expects ISO timestamps
      const toIso = (value: string) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();
      };
      const response = await apiRequest("POST", "/api/admin/investor-sessions", {
        ...data,
        startTime: toIso(data.startTime),
        endTime: toIso(data.endTime),
      });
      return response.json();
    },
    onSuccess: () => {
      setIsCreateSessionOpen(false);
      sessionForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Session scheduled" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  const assignCohortMutation = useMutation({
    mutationFn: async (data: CohortAssignmentData) => {
      const response = await apiRequest("POST", `/api/admin/investors/${data.investorId}/cohorts`, {
        cohortId: data.cohortId,
        role: data.role,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsAssignCohortOpen(false);
      cohortForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cohort-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cohorts"] });
      toast({ title: "Investor assigned" });
    },
    onError: (error) => {
      toast({ title: "Something went wrong", description: getApiErrorMessage(error, "Please try again."), variant: "destructive" });
    },
  });

  // Forms
  const investorForm = useForm<InvestorFormData>({
    resolver: zodResolver(investorFormSchema),
    defaultValues: {
      organization: "",
      contactEmail: "",
      sectors: [],
      stages: [],
      geography: [],
      checkSize: "",
      ndaStatus: false,
      userId: null,
      isActive: true,
    },
  });

  const sessionForm = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      investorId: "",
      title: "",
      sessionType: "",
      startTime: "",
      endTime: "",
      agenda: "",
      participantIds: [],
    },
  });

  // Track selected duration to preserve user choice
  const [selectedDuration, setSelectedDuration] = useState(60);

  // Helper to format date as local datetime string (YYYY-MM-DDTHH:mm)
  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number = 60) => {
    if (!startTime) return "";
    
    // Ensure we have a complete datetime string
    let dateTimeString = startTime;
    if (!startTime.includes('T')) {
      dateTimeString = `${startTime}T09:00`;
    }
    
    // Add seconds if missing
    if (!dateTimeString.includes(':00', dateTimeString.lastIndexOf(':'))) {
      dateTimeString += ':00';
    }
    
    const start = new Date(dateTimeString);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    
    // Ensure valid date
    if (isNaN(end.getTime())) return "";
    
    // Return local datetime string (not UTC)
    return formatLocalDateTime(end);
  };

  // Helper to combine date and time into ISO string
  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return "";
    return `${date}T${time}:00`;
  };

  // Watch start time to auto-calculate end time
  const watchStartTime = sessionForm.watch("startTime");
  
  // Auto-update end time when start time changes, preserving selected duration
  useEffect(() => {
    if (watchStartTime) {
      const calculatedEndTime = calculateEndTime(watchStartTime, selectedDuration);
      if (calculatedEndTime !== sessionForm.getValues("endTime")) {
        sessionForm.setValue("endTime", calculatedEndTime);
      }
    }
  }, [watchStartTime, sessionForm, selectedDuration]);

  const cohortForm = useForm<CohortAssignmentData>({
    resolver: zodResolver(cohortAssignmentSchema),
    defaultValues: {
      investorId: "",
      cohortId: "",
      role: "advisor",
    },
  });

  const activeInvestors = useMemo(() => investors.filter((inv) => inv.isActive !== false), [investors]);

  // Filtered investors
  const filteredInvestors = useMemo(() => {
    return investors.filter((investor: Investor) => {
      const matchesSearch = investor.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          investor.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = filterSector === "all" || investor.sectors?.includes(filterSector);
      return matchesSearch && matchesSector;
    });
  }, [investors, searchTerm, filterSector]);

  // Form handlers
  const handleCreateInvestor = (data: InvestorFormData) => {
    createInvestorMutation.mutate(data);
  };

  const handleUpdateInvestor = (data: InvestorFormData) => {
    if (editingInvestor) {
      updateInvestorMutation.mutate({ id: editingInvestor.id, data });
    }
  };

  const handleCreateSession = (data: SessionFormData) => {
    createSessionMutation.mutate(data);
  };

  const handleAssignCohort = (data: CohortAssignmentData) => {
    assignCohortMutation.mutate(data);
  };

  const openEditDialog = (investor: Investor) => {
    setEditingInvestor(investor);
    investorForm.reset({
      organization: investor.organization || "",
      contactEmail: investor.contactEmail || "",
      sectors: investor.sectors || [],
      stages: investor.stages || [],
      geography: investor.geography || [],
      checkSize: investor.checkSize || "",
      ndaStatus: investor.ndaStatus || false,
      userId: investor.userId ?? null,
      isActive: investor.isActive !== false,
    });
  };

  const openCreateDialog = (open: boolean) => {
    if (open) {
      investorForm.reset({
        organization: "",
        contactEmail: "",
        sectors: [],
        stages: [],
        geography: [],
        checkSize: "",
        ndaStatus: false,
        userId: null,
        isActive: true,
      });
    }
    setIsCreateInvestorOpen(open);
  };

  const openEditInterest = (interest: AdminInterest) => {
    setEditingInterest(interest);
    setEditInterestLevel((interest.level || "viewed") as InterestLevel);
    setEditInterestNotes(interest.notes || "");
  };

  const userLabel = (u: User) =>
    u.firstName || u.lastName ? `${[u.firstName, u.lastName].filter(Boolean).join(" ")} (${u.email})` : (u.email || u.id);

  // Investor users not already linked to a different investor record
  const availableInvestorUsers = (currentInvestorId?: string) =>
    investorUsers.filter((u) => !investors.some((inv) => inv.userId === u.id && inv.id !== currentInvestorId));

  const renderLinkAndActiveFields = (currentInvestorId?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={investorForm.control}
        name="userId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Linked investor user</FormLabel>
            <Select
              onValueChange={(value) => field.onChange(value === NO_USER ? null : value)}
              value={field.value ?? NO_USER}
            >
              <FormControl>
                <SelectTrigger data-testid={currentInvestorId ? "select-edit-investor-user" : "select-investor-user"}>
                  <SelectValue placeholder="No linked user" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_USER}>No linked user</SelectItem>
                {availableInvestorUsers(currentInvestorId).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{userLabel(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {investorUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">No users have the investor role yet. Invite one from the Users tab.</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={investorForm.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid={currentInvestorId ? "switch-edit-investor-active" : "switch-investor-active"}
              />
            </FormControl>
            <FormLabel>Active</FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium text-foreground">Investors</h2>
          <p className="text-sm text-muted-foreground">
            Manage investor records, sessions, cohort assignments and interest in projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-session">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule investor session</DialogTitle>
              </DialogHeader>
              <Form {...sessionForm}>
                <form onSubmit={sessionForm.handleSubmit(handleCreateSession)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={sessionForm.control}
                    name="investorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-investor">
                              <SelectValue placeholder="Select investor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeInvestors.map((investor: Investor) => (
                              <SelectItem key={investor.id} value={investor.id}>
                                {investor.organization}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sessionForm.control}
                    name="sessionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-session-type">
                              <SelectValue placeholder="Select session type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sessionTypeOptions.map(type => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
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
                    control={sessionForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter session title" data-testid="input-session-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={sessionForm.control}
                        name="startTime"
                        render={({ field }) => {
                          const dateValue = field.value ? field.value.split('T')[0] : '';
                          const timeValue = field.value ? field.value.split('T')[1]?.slice(0, 5) : '';
                          
                          return (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <Select 
                                onValueChange={(date) => {
                                  const time = timeValue || '09:00';
                                  const fullDateTime = `${date}T${time}:00`;
                                  field.onChange(fullDateTime);
                                  
                                  // Recalculate end time with preserved duration
                                  const endTime = calculateEndTime(fullDateTime, selectedDuration);
                                  sessionForm.setValue("endTime", endTime);
                                }}
                                value={dateValue}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-session-date">
                                    <SelectValue placeholder="Select date" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {dateOptions.map(date => (
                                    <SelectItem key={date.value} value={date.value}>
                                      {date.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      
                      <FormField
                        control={sessionForm.control}
                        name="startTime"
                        render={({ field }) => {
                          const dateValue = field.value ? field.value.split('T')[0] : '';
                          const timeValue = field.value ? field.value.split('T')[1]?.slice(0, 5) : '';
                          
                          return (
                            <FormItem>
                              <FormLabel>Start time</FormLabel>
                              <Select 
                                onValueChange={(time) => {
                                  const date = dateValue || dateOptions[0]?.value;
                                  const fullDateTime = `${date}T${time}:00`;
                                  field.onChange(fullDateTime);
                                  
                                  // Recalculate end time with preserved duration
                                  const endTime = calculateEndTime(fullDateTime, selectedDuration);
                                  sessionForm.setValue("endTime", endTime);
                                }}
                                value={timeValue}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-session-time">
                                    <SelectValue placeholder="Select time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeSlots.map(slot => (
                                    <SelectItem key={slot.value} value={slot.value}>
                                      {slot.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={sessionForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <Select 
                              onValueChange={(minutes) => {
                                const startTime = sessionForm.getValues("startTime");
                                const durationMinutes = parseInt(minutes);
                                setSelectedDuration(durationMinutes); // Save selected duration
                                if (startTime) {
                                  const endTime = calculateEndTime(startTime, durationMinutes);
                                  sessionForm.setValue("endTime", endTime);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-session-duration">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="90">1.5 hours</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={sessionForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End time</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="datetime-local" 
                                data-testid="input-end-time"
                                readOnly
                                className="bg-muted text-muted-foreground"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={sessionForm.control}
                    name="agenda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agenda</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Session agenda" data-testid="textarea-agenda" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateSessionOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSessionMutation.isPending} data-testid="button-submit-session">
                      {createSessionMutation.isPending ? "Creating..." : "Schedule session"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateInvestorOpen} onOpenChange={openCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-investor">
                <Plus className="w-4 h-4 mr-2" />
                Add investor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add investor</DialogTitle>
              </DialogHeader>
              <Form {...investorForm}>
                <form onSubmit={investorForm.handleSubmit(handleCreateInvestor)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={investorForm.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Organization name" data-testid="input-organization" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={investorForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contact@example.com" data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={investorForm.control}
                    name="sectors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sectors</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                          {sectorOptions.map((sector) => (
                            <div key={sector} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-primary"
                                id={`sector-${sector}`}
                                checked={field.value.includes(sector)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, sector]);
                                  } else {
                                    field.onChange(field.value.filter((s) => s !== sector));
                                  }
                                }}
                                data-testid={`checkbox-sector-${sector.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              />
                              <label htmlFor={`sector-${sector}`} className="text-sm">
                                {sector}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={investorForm.control}
                    name="stages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stages</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {stageOptions.map((stage) => (
                            <div key={stage} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-primary"
                                id={`stage-${stage}`}
                                checked={field.value.includes(stage)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, stage]);
                                  } else {
                                    field.onChange(field.value.filter((s) => s !== stage));
                                  }
                                }}
                                data-testid={`checkbox-stage-${stage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              />
                              <label htmlFor={`stage-${stage}`} className="text-sm">
                                {stage}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={investorForm.control}
                    name="geography"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geographic focus</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {geographyOptions.map((geo) => (
                            <div key={geo} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-primary"
                                id={`geo-${geo}`}
                                checked={field.value.includes(geo)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, geo]);
                                  } else {
                                    field.onChange(field.value.filter((g) => g !== geo));
                                  }
                                }}
                                data-testid={`checkbox-geo-${geo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              />
                              <label htmlFor={`geo-${geo}`} className="text-sm">
                                {geo}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={investorForm.control}
                    name="checkSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-check-size">
                              <SelectValue placeholder="Select check size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {checkSizeOptions.map(size => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderLinkAndActiveFields()}

                  <FormField
                    control={investorForm.control}
                    name="ndaStatus"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-primary"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-nda-status"
                          />
                        </FormControl>
                        <FormLabel>NDA signed</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateInvestorOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInvestorMutation.isPending} data-testid="button-submit-investor">
                      {createInvestorMutation.isPending ? "Adding..." : "Add investor"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="investors" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto">
          <TabsTrigger value="investors" data-testid="tab-investors">Investors</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
          <TabsTrigger value="cohorts" data-testid="tab-cohorts">Cohort assignments</TabsTrigger>
          <TabsTrigger value="interests" data-testid="tab-interests">Interests</TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by organization or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-investors"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-sector">
                <SelectValue placeholder="Filter by sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Investors table */}
          {investorsLoading ? (
            <Card className="space-y-3 p-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </Card>
          ) : filteredInvestors.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Organization</TableHead>
                    <TableHead>Sectors</TableHead>
                    <TableHead>Stages</TableHead>
                    <TableHead>Check size</TableHead>
                    <TableHead>NDA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map((investor: Investor) => {
                    const linked = investor.userId ? allUsers.find((u) => u.id === investor.userId) : undefined;
                    return (
                      <TableRow key={investor.id} className={investor.isActive === false ? "text-muted-foreground" : ""}>
                        <TableCell className="min-w-[16rem]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="bg-secondary font-display text-xs font-medium text-primary">
                                {(investor.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground" data-testid={`investor-name-${investor.id}`}>
                                {investor.organization}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">{investor.contactEmail}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {investor.userId ? `User: ${linked ? (linked.email || linked.id) : "linked"}` : "No linked user"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[10rem]">
                          <div className="flex flex-wrap gap-1">
                            {(investor.sectors || []).map((sector: string, index: number) => (
                              <Badge key={index} variant="secondary">{sector}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[8rem]">
                          <div className="flex flex-wrap gap-1">
                            {(investor.stages || []).map((stage: string, index: number) => (
                              <Badge key={index} variant="outline">{stage}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-display">
                          {investor.checkSize || "Not specified"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {investor.ndaStatus ? (
                            <span className="flex items-center gap-1 font-display text-xs text-success">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Signed
                            </span>
                          ) : (
                            <span className="font-display text-xs text-muted-foreground">Not signed</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {investor.isActive === false ? (
                            <Badge variant="secondary" data-testid={`badge-inactive-${investor.id}`}>
                              Inactive
                            </Badge>
                          ) : (
                            <Badge>Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!investor.contactEmail}
                              onClick={() => { if (investor.contactEmail) window.location.href = `mailto:${investor.contactEmail}`; }}
                              data-testid={`button-contact-${investor.id}`}
                            >
                              <Mail className="h-4 w-4 mr-1.5" />
                              Contact
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(investor)}
                              aria-label="Edit investor"
                              title="Edit investor"
                              data-testid={`button-edit-${investor.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {investor.isActive === false ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => reactivateInvestorMutation.mutate(investor.id)}
                                disabled={reactivateInvestorMutation.isPending}
                                aria-label="Reactivate investor"
                                title="Reactivate investor"
                                data-testid={`button-reactivate-${investor.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deactivateInvestorMutation.mutate(investor.id)}
                                disabled={deactivateInvestorMutation.isPending}
                                aria-label="Deactivate investor"
                                title="Deactivate investor"
                                data-testid={`button-deactivate-${investor.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : null}

          {filteredInvestors.length === 0 && !investorsLoading && (
            <div className="dashed-zone bg-card p-8 text-center">
              <Building className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="mb-1 text-base">No investors found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterSector !== "all" 
                  ? "Try a different search or sector filter."
                  : "Add the first investor to get started."
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {sessionsLoading ? (
            <Card className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </Card>
          ) : sessions.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Session</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Date and time</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell className="min-w-[14rem]">
                        <div className="font-medium" data-testid={`session-title-${session.id}`}>{session.title}</div>
                        {session.agenda && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{session.agenda}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {session.sessionType?.charAt(0).toUpperCase() + session.sessionType?.slice(1).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {session.investorOrganization}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-display text-sm">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-display text-sm text-muted-foreground">
                        {session.participantIds && session.participantIds.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {session.participantIds.length} participant{session.participantIds.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="dashed-zone bg-card p-8 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="mb-1 text-base">No sessions scheduled</h3>
              <p className="text-sm text-muted-foreground">
                Schedule the first investor session to get started.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg">Cohort assignments</h3>
            <Dialog open={isAssignCohortOpen} onOpenChange={setIsAssignCohortOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-assign-cohort">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign to cohort
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign investor to cohort</DialogTitle>
                </DialogHeader>
                <Form {...cohortForm}>
                  <form onSubmit={cohortForm.handleSubmit(handleAssignCohort)} className="space-y-4">
                    <FormField
                      control={cohortForm.control}
                      name="investorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Investor</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assign-investor">
                                <SelectValue placeholder="Select investor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeInvestors.map((investor: Investor) => (
                                <SelectItem key={investor.id} value={investor.id}>
                                  {investor.organization}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={cohortForm.control}
                      name="cohortId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cohort</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assign-cohort">
                                <SelectValue placeholder="Select cohort" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cohorts.map((cohort: Cohort) => (
                                <SelectItem key={cohort.id} value={cohort.id}>
                                  {cohort.name}{cohort.isActive === false ? " (Inactive)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={cohortForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assign-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {investorRoleOptions.map(role => (
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
                      <Button type="button" variant="outline" onClick={() => setIsAssignCohortOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={assignCohortMutation.isPending} data-testid="button-submit-assignment">
                        {assignCohortMutation.isPending ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {assignmentsLoading ? (
            <Card className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </Card>
          ) : cohortAssignments.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Investor</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohortAssignments.map((assignment: InvestorCohortParticipation) => {
                    const investor = investors.find((inv: Investor) => inv.id === assignment.investorId);
                    const cohort = cohorts.find((coh: Cohort) => coh.id === assignment.cohortId);
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="min-w-[12rem]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="bg-secondary font-display text-xs font-medium text-primary">
                                {(investor?.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium" data-testid={`assignment-investor-${assignment.id}`}>
                              {investor?.organization ?? "Unknown investor"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[10rem]">
                          <div>
                            {cohort?.name ?? "Unknown cohort"}
                            {cohort?.isActive === false ? " (Inactive)" : ""}
                          </div>
                          {cohort && (
                            <div className="font-display text-xs text-muted-foreground">
                              {formatCohortDate(cohort.startDate)} - {formatCohortDate(cohort.endDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {assignment.role ? assignment.role.charAt(0).toUpperCase() + assignment.role.slice(1).replace('_', ' ') : "Unknown role"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                            {assignment.status ? assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1) : "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-display text-sm text-muted-foreground">
                          {assignment.assignedAt && new Date(assignment.assignedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="dashed-zone bg-card p-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="mb-1 text-base">No cohort assignments</h3>
              <p className="text-sm text-muted-foreground">
                Assign investors to cohorts to get started.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="interests" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg">Investor interests</h3>
            <Dialog open={isCreateInterestOpen} onOpenChange={setIsCreateInterestOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-interest">
                  <Plus className="w-4 h-4 mr-2" />
                  Record interest
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record investor interest</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newInterest.investorId || !newInterest.projectId) {
                      toast({ title: "Missing details", description: "Choose an investor and a project.", variant: "destructive" });
                      return;
                    }
                    createInterestMutation.mutate(newInterest);
                  }}
                >
                  <div className="space-y-2">
                    <label className="font-display text-sm font-medium">Investor</label>
                    <Select value={newInterest.investorId} onValueChange={(v) => setNewInterest((p) => ({ ...p, investorId: v }))}>
                      <SelectTrigger data-testid="select-interest-investor">
                        <SelectValue placeholder="Select investor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeInvestors.map((investor) => (
                          <SelectItem key={investor.id} value={investor.id}>{investor.organization || investor.contactEmail || investor.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-display text-sm font-medium">Project</label>
                    <Select value={newInterest.projectId} onValueChange={(v) => setNewInterest((p) => ({ ...p, projectId: v }))}>
                      <SelectTrigger data-testid="select-interest-project">
                        <SelectValue placeholder={projects.length === 0 ? "No projects yet" : "Select project"} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-display text-sm font-medium">Level</label>
                    <Select value={newInterest.level} onValueChange={(v) => setNewInterest((p) => ({ ...p, level: v as InterestLevel }))}>
                      <SelectTrigger data-testid="select-interest-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {interestLevelOptions.map((level) => (
                          <SelectItem key={level} value={level}>{formatLevel(level)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-display text-sm font-medium">Notes</label>
                    <Textarea
                      value={newInterest.notes}
                      onChange={(e) => setNewInterest((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional notes"
                      data-testid="textarea-interest-notes"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If this investor already has an interest in the project, it is updated instead of duplicated.
                  </p>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateInterestOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInterestMutation.isPending} data-testid="button-submit-interest">
                      {createInterestMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {interestsLoading ? (
            <Card className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </Card>
          ) : interests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Project</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interests.map((interest) => {
                    const investor = investors.find((inv) => inv.id === interest.investorId);
                    const projectName = interest.projectName || projects.find((p) => p.id === interest.projectId)?.name || "Unknown project";
                    return (
                      <TableRow key={interest.id}>
                        <TableCell className="min-w-[10rem] font-medium" data-testid={`interest-project-${interest.id}`}>
                          {projectName}
                        </TableCell>
                        <TableCell className="min-w-[10rem] text-muted-foreground">
                          {investor?.organization ?? "Unknown investor"}
                          {investor?.isActive === false ? " (Inactive)" : ""}
                        </TableCell>
                        <TableCell>
                          <Badge className={`whitespace-nowrap ${interestLevelClass(interest.level)}`}>
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {formatLevel(interest.level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[14rem] max-w-sm">
                          {interest.notes && <p className="line-clamp-2 text-sm">{interest.notes}</p>}
                          {interest.questions && interest.questions.length > 0 && (
                            <p className="font-display text-xs text-muted-foreground">
                              {interest.questions.length} question{interest.questions.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-display text-sm text-muted-foreground">
                          {(interest.updatedAt || interest.createdAt) &&
                            new Date((interest.updatedAt || interest.createdAt) as unknown as string).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEditInterest(interest)}
                            aria-label="Edit investor interest"
                            title="Edit investor interest"
                            data-testid={`button-edit-interest-${interest.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="dashed-zone bg-card p-8 text-center">
              <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="mb-1 text-base">No investor interest recorded yet</h3>
              <p className="text-sm text-muted-foreground">
                Record an investor's interest in a project to track the pipeline.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Interest Dialog */}
      <Dialog open={editingInterest !== null} onOpenChange={(open) => { if (!open) setEditingInterest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit investor interest</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editingInterest) {
                updateInterestMutation.mutate({ id: editingInterest.id, level: editInterestLevel, notes: editInterestNotes });
              }
            }}
          >
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">Level</label>
              <Select value={editInterestLevel} onValueChange={(v) => setEditInterestLevel(v as InterestLevel)}>
                <SelectTrigger data-testid="select-edit-interest-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interestLevelOptions.map((level) => (
                    <SelectItem key={level} value={level}>{formatLevel(level)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">Notes</label>
              <Textarea
                value={editInterestNotes}
                onChange={(e) => setEditInterestNotes(e.target.value)}
                data-testid="textarea-edit-interest-notes"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingInterest(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateInterestMutation.isPending} data-testid="button-update-interest">
                {updateInterestMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Investor Dialog */}
      <Dialog open={editingInvestor !== null} onOpenChange={() => setEditingInvestor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit investor</DialogTitle>
          </DialogHeader>
          <Form {...investorForm}>
            <form onSubmit={investorForm.handleSubmit(handleUpdateInvestor)} className="space-y-4">
              {/* Same form fields as create, but populated with existing data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={investorForm.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Organization name" data-testid="input-edit-organization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={investorForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@example.com" data-testid="input-edit-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={investorForm.control}
                name="checkSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-check-size">
                          <SelectValue placeholder="Select check size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {checkSizeOptions.map(size => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {renderLinkAndActiveFields(editingInvestor?.id)}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingInvestor(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateInvestorMutation.isPending} data-testid="button-update-investor">
                  {updateInvestorMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}