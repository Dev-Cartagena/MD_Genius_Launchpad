import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Investor } from "@shared/schema";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getApiErrorMessage } from "@/lib/utils";
import {
  TrendingUp,
  Search,
  Calendar,
  DollarSign,
  Building,
  Users,
  Star,
  Eye,
  MessageSquare,
  Filter,
  Download,
  ExternalLink,
  Play,
  FileText,
  Mail,
  Phone
} from "lucide-react";

type ExtendedInvestor = Investor;

// Display labels for project stages (values stay as stored)
const STAGE_LABELS: Record<string, string> = {
  ideation: "Ideation",
  validation: "Validation",
  mvp_build: "MVP build",
  pilot_traction: "Pilot traction",
  pitch_ready: "Pitch ready",
};
const stageLabel = (stage: string) => STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");

// Session booking form schema
const investorSessionBookingSchema = z.object({
  title: z.string().min(5, "Session title must be at least 5 characters"),
  agenda: z.string().min(10, "Please provide at least 10 characters for the session agenda"),
  startTime: z.string().min(1, "Please select a start time"),
  duration: z.number().min(30, "Session must be at least 30 minutes").max(120, "Session cannot exceed 2 hours").default(60),
  sessionType: z.string().default("pitch"),
});

type InvestorSessionBookingFormData = z.infer<typeof investorSessionBookingSchema>;

// Investor Session Booking Dialog Component
function InvestorSessionBookingDialog({ investor, isOpen, onClose }: { 
  investor: ExtendedInvestor; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InvestorSessionBookingFormData>({
    resolver: zodResolver(investorSessionBookingSchema),
    defaultValues: {
      title: "",
      agenda: "",
      startTime: "",
      duration: 60,
      sessionType: "pitch",
    },
  });

  // Generate time slots with accurate labels
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    
    // Generate slots for next 7 days
    for (let day = 1; day <= 7; day++) {
      const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Add morning and afternoon slots
      const morningSlot = new Date(date);
      morningSlot.setHours(10, 0, 0, 0);
      
      const afternoonSlot = new Date(date);
      afternoonSlot.setHours(14, 0, 0, 0);
      
      slots.push({
        value: morningSlot.toISOString(),
        label: `${dayName} ${dateStr} at 10:00 AM`
      });
      
      slots.push({
        value: afternoonSlot.toISOString(),
        label: `${dayName} ${dateStr} at 2:00 PM`
      });
    }
    
    return slots.slice(0, 8); // Return first 8 slots
  };
  
  const timeSlots = generateTimeSlots();

  const bookSession = useMutation({
    mutationFn: async (data: InvestorSessionBookingFormData) => {
      const endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60 * 1000).toISOString();
      
      return apiRequest("POST", "/api/investor-sessions/book", {
        investorId: investor.id,
        title: data.title,
        agenda: data.agenda,
        startTime: new Date(data.startTime).toISOString(),
        endTime: endTime,
        sessionType: data.sessionType,
      });
    },
    onSuccess: () => {
      toast({
        title: "Session booked",
        description: `Your session with ${investor.organization} is scheduled.`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/sessions"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Could not book session",
        description: getApiErrorMessage(error, "The session could not be booked. Please try again."),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvestorSessionBookingFormData) => {
    bookSession.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a session with {investor.organization}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Funding discussion"
                      {...field}
                      data-testid={`input-session-title-${investor.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-session-type-${investor.id}`}>
                        <SelectValue placeholder="Select session type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pitch">Pitch session</SelectItem>
                      <SelectItem value="feedback">Feedback session</SelectItem>
                      <SelectItem value="due_diligence">Due diligence</SelectItem>
                      <SelectItem value="demo_day">Demo day practice</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available time slots</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-timeslot-${investor.id}`}>
                        <SelectValue placeholder="Select a time slot" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session duration</FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-duration-${investor.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session agenda</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What would you like to discuss? Include specific questions or topics."
                      className="min-h-[80px]"
                      {...field}
                      data-testid={`textarea-session-agenda-${investor.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid={`button-cancel-booking-${investor.id}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bookSession.isPending}
                className="flex-1"
                data-testid={`button-confirm-booking-${investor.id}`}
              >
                {bookSession.isPending ? "Booking..." : "Book session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedTab, setSelectedTab] = useState("directory");
  const [selectedInvestorForBooking, setSelectedInvestorForBooking] = useState<ExtendedInvestor | null>(null);
  const [meetingMessages, setMeetingMessages] = useState<Record<string, string>>({});
  // Which startup's meeting dialog is open (null = none).
  const [meetingDialogFor, setMeetingDialogFor] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if user is investor vs participant/other
  const isInvestor = user?.role === "investor";
  // Only participants can book investor sessions (the server rejects other roles)
  const canBookSessions = user?.role === "participant";

  // Fetch startup projects for directory
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch investors (for admin/participant view)
  const { data: investors = [], isLoading: investorsLoading } = useQuery<any[]>({
    queryKey: ["/api/investors"],
    enabled: !isInvestor,
  });

  const displayStartups = projects;
  // The directory only lists investors that are currently active
  const displayInvestors = investors.filter((investor: any) => investor?.isActive !== false);

  // Request meeting mutation
  const requestMeeting = useMutation({
    mutationFn: async ({ startupId, message }: { startupId: string; message: string }) => {
      const response = await apiRequest("POST", "/api/investor/meetings", {
        startupId,
        message
      });
      return response.json();
    },
    onSuccess: () => {
      setMeetingDialogFor(null);
      toast({
        title: "Meeting requested",
        description: "Your request has been sent to the startup team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/interests"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired", 
          description: "You have been signed out. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not send request",
        description: getApiErrorMessage(error, "The meeting request could not be sent. Please try again."),
        variant: "destructive",
      });
    }
  });

  const filteredStartups = displayStartups.filter((startup: any) => {
    const name = startup?.name || "";
    const sector = startup?.aiComponents?.[0] || "";
    const description = startup?.summary || "";
    const stage = startup?.stage || "";
    
    const matchesSearch = searchQuery === "" || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSector === "all" || sector === selectedSector;
    const matchesStage = selectedStage === "all" || stage === selectedStage;

    return matchesSearch && matchesSector && matchesStage;
  });

  const filteredInvestors = displayInvestors.filter((investor: any) => {
    const organization = investor?.organization || "";
    const sectors = investor?.sectors || [];
    
    const matchesSearch = searchQuery === "" ||
      organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sectors.some((sector: string) => sector.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Projects have no sector field; their primary AI component is used as the sector
  const sectors = Array.from(
    new Set(displayStartups.map((startup: any) => startup?.aiComponents?.[0]).filter(Boolean) as string[])
  ).sort();
  const stages = ["ideation", "validation", "mvp_build", "pilot_traction", "pitch_ready"];

  if (projectsLoading || investorsLoading) {
    return (
      <AppLayout title="Investors" subtitle="Loading...">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Investors" 
      subtitle={isInvestor ? "Review the AI startups in the current Launchpad cohort" : "Find investors whose focus matches your venture"}
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="directory" data-testid="tab-startup-directory">
              {isInvestor ? "Startup directory" : "Investor directory"}
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">
              Events and demo days
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Search and Filters */}
            <div className="panel p-3 flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <div className="relative flex-1 min-w-0 sm:min-w-[240px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder={isInvestor ? "Search startups" : "Search investors"} 
                        className="pl-10"
                        aria-label={isInvestor ? "Search startups" : "Search investors"}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-directory"
                      />
                  </div>
                  
                  {isInvestor && (
                    <>
                      <Select value={selectedSector} onValueChange={setSelectedSector}>
                        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by sector" data-testid="select-sector-filter">
                          <SelectValue placeholder="Sector" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sectors</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedStage} onValueChange={setSelectedStage}>
                        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by stage" data-testid="select-stage-filter">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All stages</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stageLabel(stage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
            </div>

            {/* Directory Content */}
            {isInvestor ? (
              // Startup Directory for Investors
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups.map((startup: any) => (
                  <Card key={startup.id} className="transition-colors hover:border-accent/40">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                          <Avatar className="h-11 w-11 shrink-0 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-display">
                              {(startup.name || "S").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <CardTitle className="font-display text-lg font-medium break-words" data-testid={`startup-name-${startup.id}`}>
                              {startup.name}
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {startup.aiComponents?.[0] && (
                            <Badge variant="secondary" data-testid={`startup-sector-${startup.id}`}>
                              {startup.aiComponents[0]}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline"
                            className={`${
                              startup.stage === 'pitch_ready' ? 'border-success/40 bg-success/10 text-success' :
                              startup.stage === 'mvp_build' ? 'border-primary/30 text-primary' :
                              'border-accent/40 text-accent'
                            }`}
                            data-testid={`startup-stage-${startup.id}`}
                          >
                            {stageLabel(startup.stage || "ideation")}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`startup-description-${startup.id}`}>
                        {startup.summary}
                      </p>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-display text-muted-foreground">Readiness</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-1.5 bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${startup.readinessScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="font-display font-medium" data-testid={`startup-readiness-${startup.id}`}>
                              {startup.readinessScore || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div />
                        <div className="flex space-x-2">
                          <Dialog
                            open={meetingDialogFor === startup.id}
                            onOpenChange={(open) => setMeetingDialogFor(open ? startup.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                data-testid={`button-request-meeting-${startup.id}`}
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Meet
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Request a meeting with {startup.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea 
                                  placeholder="Introduce yourself and explain your interest in this startup."
                                  className="min-h-[100px]"
                                  value={meetingMessages[startup.id] ?? ""}
                                  onChange={(e) => setMeetingMessages(prev => ({ ...prev, [startup.id]: e.target.value }))}
                                  data-testid={`textarea-meeting-request-${startup.id}`}
                                />
                                <Button 
                                  className="w-full"
                                  onClick={() => requestMeeting.mutate({ 
                                    startupId: startup.id, 
                                    message: meetingMessages[startup.id]?.trim() || "Meeting request" 
                                  })}
                                  disabled={requestMeeting.isPending}
                                  data-testid={`button-send-meeting-request-${startup.id}`}
                                >
                                  {requestMeeting.isPending ? "Sending..." : "Send meeting request"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Investor Directory for Participants
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInvestors.map((investor: any) => (
                  <Card key={investor.id} className="transition-colors hover:border-accent/40">
                    <CardHeader>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-11 w-11 shrink-0 rounded-lg bg-primary text-primary-foreground font-display flex items-center justify-center"
                          aria-hidden="true"
                        >
                          {(investor.organization || "I").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="font-display text-lg font-medium break-words" data-testid={`investor-name-${investor.id}`}>
                            {investor.organization}
                          </CardTitle>
                          {investor.contactEmail && (
                            <p className="text-sm text-muted-foreground break-all" data-testid={`investor-description-${investor.id}`}>
                              {investor.contactEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-sm text-muted-foreground mb-2">Investment focus</h4>
                          <div className="flex flex-wrap gap-1">
                            {(investor.sectors || []).map((sector: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {sector}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-display text-muted-foreground">Check size</span>
                            <p className="font-medium" data-testid={`investor-check-size-${investor.id}`}>
                              {investor.checkSize || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <span className="font-display text-muted-foreground">Geography</span>
                            <p className="font-medium">
                              {(investor.geography || []).length > 0 ? investor.geography.join(", ") : "Not specified"}
                            </p>
                          </div>
                        </div>
                        
                        {(investor.stages || []).length > 0 && (
                          <div>
                            <h4 className="font-display text-sm text-muted-foreground mb-2">Stages</h4>
                            <div className="flex flex-wrap gap-1">
                              {investor.stages.map((stage: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {stage}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                          <Button 
                            size="sm"
                            variant="outline"
                            disabled={!investor.contactEmail}
                            onClick={() => { if (investor.contactEmail) window.location.href = `mailto:${investor.contactEmail}`; }}
                            data-testid={`button-contact-investor-${investor.id}`}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
                          {canBookSessions && (
                            <Button 
                              size="sm"
                              onClick={() => setSelectedInvestorForBooking(investor)}
                              data-testid={`button-book-session-${investor.id}`}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Book session
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {((isInvestor && filteredStartups.length === 0) || (!isInvestor && filteredInvestors.length === 0)) && (
              <div className="rounded-xl border border-dashed border-steel/50 p-8 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg mb-2">
                    {isInvestor ? "No startups found" : "No investors found"}
                  </h3>
                  <p className="text-muted-foreground">
                    Try a different search or adjust the filters.
                  </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="rounded-xl border border-dashed border-steel/50 p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg mb-2" data-testid="events-empty-title">
                  No events scheduled yet
                </h3>
                <p className="text-muted-foreground">
                  Demo days and investor events will be listed here once the program team announces them.
                </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Investor Session Booking Dialog */}
      {selectedInvestorForBooking && (
        <InvestorSessionBookingDialog
          investor={selectedInvestorForBooking}
          isOpen={!!selectedInvestorForBooking}
          onClose={() => setSelectedInvestorForBooking(null)}
        />
      )}
    </AppLayout>
  );
}
