import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { 
  Investor, 
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MessageCircle
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
    queryKey: ["/api/cohorts"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/admin/projects"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      setIsCreateInvestorOpen(false);
      toast({ title: "Success", description: "Investor created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create investor", variant: "destructive" });
    },
  });

  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvestorFormData> }) => {
      const response = await apiRequest("PUT", `/api/admin/investors/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      setEditingInvestor(null);
      toast({ title: "Success", description: "Investor updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update investor", variant: "destructive" });
    },
  });

  const deactivateInvestorMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/investors/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ title: "Success", description: "Investor deactivated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to deactivate investor", variant: "destructive" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const response = await apiRequest("POST", "/api/admin/investor-sessions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investor-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      setIsCreateSessionOpen(false);
      sessionForm.reset();
      toast({ title: "Success", description: "Session created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create session", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cohort-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
      setIsAssignCohortOpen(false);
      cohortForm.reset();
      toast({ title: "Success", description: "Investor assigned to cohort successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to assign investor to cohort", variant: "destructive" });
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

  // Helper to calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number = 60) => {
    if (!startTime) return "";
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toISOString().slice(0, 16);
  };

  // Helper to combine date and time into ISO string
  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return "";
    return `${date}T${time}:00`;
  };

  // Watch start time to auto-calculate end time
  const watchStartTime = sessionForm.watch("startTime");
  
  // Auto-update end time when start time changes
  if (watchStartTime) {
    const calculatedEndTime = calculateEndTime(watchStartTime);
    if (calculatedEndTime !== sessionForm.getValues("endTime")) {
      sessionForm.setValue("endTime", calculatedEndTime);
    }
  }

  const cohortForm = useForm<CohortAssignmentData>({
    resolver: zodResolver(cohortAssignmentSchema),
    defaultValues: {
      investorId: "",
      cohortId: "",
      role: "advisor",
    },
  });

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
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Investor Management</h2>
        <div className="flex space-x-2">
          <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-session">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Investor Session</DialogTitle>
              </DialogHeader>
              <Form {...sessionForm}>
                <form onSubmit={sessionForm.handleSubmit(handleCreateSession)} className="space-y-4">
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
                            {investors.map((investor: Investor) => (
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter session title" data-testid="input-session-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sessionForm.control}
                    name="sessionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Type</FormLabel>
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

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                                  field.onChange(`${date}T${time}`);
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
                              <FormLabel>Start Time</FormLabel>
                              <Select 
                                onValueChange={(time) => {
                                  const date = dateValue || dateOptions[0]?.value;
                                  field.onChange(`${date}T${time}`);
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={sessionForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <Select 
                              onValueChange={(minutes) => {
                                const startTime = sessionForm.getValues("startTime");
                                if (startTime) {
                                  const endTime = calculateEndTime(startTime, parseInt(minutes));
                                  field.onChange(endTime);
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
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="datetime-local" 
                                data-testid="input-end-time"
                                readOnly
                                className="bg-muted"
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
                      {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateInvestorOpen} onOpenChange={setIsCreateInvestorOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-investor">
                <Plus className="w-4 h-4 mr-2" />
                Add Investor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Investor</DialogTitle>
              </DialogHeader>
              <Form {...investorForm}>
                <form onSubmit={investorForm.handleSubmit(handleCreateInvestor)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                          <FormLabel>Contact Email</FormLabel>
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
                        <FormLabel>Investment Sectors</FormLabel>
                        <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                          {sectorOptions.map((sector) => (
                            <div key={sector} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
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
                        <FormLabel>Investment Stages</FormLabel>
                        <div className="grid grid-cols-4 gap-2">
                          {stageOptions.map((stage) => (
                            <div key={stage} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
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
                        <FormLabel>Geographic Focus</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {geographyOptions.map((geo) => (
                            <div key={geo} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
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
                        <FormLabel>Check Size</FormLabel>
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

                  <FormField
                    control={investorForm.control}
                    name="ndaStatus"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-nda-status"
                          />
                        </FormControl>
                        <FormLabel>NDA Signed</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateInvestorOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInvestorMutation.isPending} data-testid="button-submit-investor">
                      {createInvestorMutation.isPending ? "Creating..." : "Create Investor"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="investors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="investors" data-testid="tab-investors">Investors</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">Sessions</TabsTrigger>
          <TabsTrigger value="cohorts" data-testid="tab-cohorts">Cohort Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-investors"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-48" data-testid="select-filter-sector">
                <SelectValue placeholder="Filter by sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Investors Grid */}
          {investorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInvestors.map((investor: Investor) => (
                <Card key={investor.id} className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {(investor.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg" data-testid={`investor-name-${investor.id}`}>
                            {investor.organization}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {investor.contactEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openEditDialog(investor)}
                          data-testid={`button-edit-${investor.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deactivateInvestorMutation.mutate(investor.id)}
                          data-testid={`button-deactivate-${investor.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Sectors</h4>
                        <div className="flex flex-wrap gap-1">
                          {(investor.sectors || []).map((sector: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Stages</h4>
                        <div className="flex flex-wrap gap-1">
                          {(investor.stages || []).map((stage: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Building className="w-3 h-3" />
                            <span>{investor.checkSize || "Not specified"}</span>
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`mailto:${investor.contactEmail}`, '_blank')}
                            data-testid={`button-contact-${investor.id}`}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                      
                      {investor.ndaStatus && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-xs">NDA Signed</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredInvestors.length === 0 && !investorsLoading && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No investors found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterSector !== "all" 
                    ? "Try adjusting your search criteria or filters."
                    : "Get started by adding your first investor to the platform."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionsLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : sessions.length > 0 ? (
              sessions.map((session: any) => (
                <Card key={session.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span data-testid={`session-title-${session.id}`}>{session.title}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {session.sessionType?.charAt(0).toUpperCase() + session.sessionType?.slice(1).replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {session.investorOrganization}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString()}
                      </div>
                      {session.agenda && (
                        <p className="text-sm">{session.agenda}</p>
                      )}
                      {session.participantIds && session.participantIds.length > 0 && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="w-4 h-4 mr-2" />
                          {session.participantIds.length} participant{session.participantIds.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-card col-span-full">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sessions scheduled</h3>
                  <p className="text-muted-foreground">
                    Schedule your first investor session to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cohort Assignments</h3>
            <Dialog open={isAssignCohortOpen} onOpenChange={setIsAssignCohortOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-assign-cohort">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign to Cohort
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Investor to Cohort</DialogTitle>
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
                              {investors.map((investor: Investor) => (
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
                                  {cohort.name}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignmentsLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : cohortAssignments.length > 0 ? (
              cohortAssignments.map((assignment: InvestorCohortParticipation) => {
                const investor = investors.find((inv: Investor) => inv.id === assignment.investorId);
                const cohort = cohorts.find((coh: Cohort) => coh.id === assignment.cohortId);
                return (
                  <Card key={assignment.id} className="glass-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                              {(investor?.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base" data-testid={`assignment-investor-${assignment.id}`}>
                              {investor?.organization ?? "Unknown Investor"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {cohort?.name ?? "Unknown Cohort"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {assignment.role ? assignment.role.charAt(0).toUpperCase() + assignment.role.slice(1).replace('_', ' ') : "Unknown Role"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={assignment.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {assignment.status ? assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1) : "Unknown"}
                          </Badge>
                        </div>
                        {assignment.assignedAt && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="glass-card col-span-full">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cohort assignments</h3>
                  <p className="text-muted-foreground">
                    Assign investors to cohorts to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Investor Dialog */}
      <Dialog open={editingInvestor !== null} onOpenChange={() => setEditingInvestor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Investor</DialogTitle>
          </DialogHeader>
          <Form {...investorForm}>
            <form onSubmit={investorForm.handleSubmit(handleUpdateInvestor)} className="space-y-4">
              {/* Same form fields as create, but populated with existing data */}
              <div className="grid grid-cols-2 gap-4">
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
                      <FormLabel>Contact Email</FormLabel>
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
                    <FormLabel>Check Size</FormLabel>
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

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingInvestor(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateInvestorMutation.isPending} data-testid="button-update-investor">
                  {updateInvestorMutation.isPending ? "Updating..." : "Update Investor"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}