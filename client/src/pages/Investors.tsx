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

// Extended investor type for UI compatibility
type ExtendedInvestor = Investor & {
  // Optional UI fields for compatibility with mock data
  description?: string;
  portfolioSize?: number;
  notableInvestments?: string[];
  isAvailable?: boolean;
  nextAvailable?: string;
};

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
        title: "Session Booked!",
        description: `Your session with ${investor.organization} has been scheduled successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participant/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/sessions"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: getApiErrorMessage(error, "Failed to book session. Please try again."),
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
          <DialogTitle>Schedule Session with {investor.organization}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Funding Discussion"
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
                  <FormLabel>Session Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-session-type-${investor.id}`}>
                        <SelectValue placeholder="Select session type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pitch">Pitch Session</SelectItem>
                      <SelectItem value="feedback">Feedback Session</SelectItem>
                      <SelectItem value="due_diligence">Due Diligence</SelectItem>
                      <SelectItem value="demo_day">Demo Day Practice</SelectItem>
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
                  <FormLabel>Available Time Slots</FormLabel>
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
                  <FormLabel>Session Duration</FormLabel>
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
                  <FormLabel>Session Agenda</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What would you like to discuss? Include specific questions or topics for the session..."
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
                {bookSession.isPending ? "Booking..." : "Book Session"}
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if user is investor vs participant/other
  const isInvestor = user?.role === "investor";

  // Fetch startup projects for directory
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch investors (for admin/participant view)
  const { data: investors = [], isLoading: investorsLoading } = useQuery<any[]>({
    queryKey: ["/api/investors"],
    enabled: !isInvestor,
  });

  // Use only real project data from API

  // Use only real investor data from API

  // Use only real data from APIs
  const displayStartups = projects;
  const displayInvestors = investors;

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
      toast({
        title: "Meeting Requested!",
        description: "Your meeting request has been sent. The startup will respond soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investor/interests"] });
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
        description: "Failed to request meeting. Please try again.",
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
            <Card key={i} className="glass-card animate-pulse">
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
      subtitle={isInvestor ? "Discover promising AI startups" : "Connect with potential investors"}
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="directory" data-testid="tab-startup-directory">
              {isInvestor ? "Startup Directory" : "Investor Directory"}
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">
              Events & Demo Days
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6">
            {/* Search and Filters */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder={isInvestor ? "Search startups..." : "Search investors..."} 
                        className="pl-10 bg-secondary border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-directory"
                      />
                    </div>
                  </div>
                  
                  {isInvestor && (
                    <div className="flex gap-2">
                      <Select value={selectedSector} onValueChange={setSelectedSector}>
                        <SelectTrigger className="w-40 bg-secondary border-border" data-testid="select-sector-filter">
                          <SelectValue placeholder="Sector" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sectors</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedStage} onValueChange={setSelectedStage}>
                        <SelectTrigger className="w-40 bg-secondary border-border" data-testid="select-stage-filter">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Directory Content */}
            {isInvestor ? (
              // Startup Directory for Investors
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStartups.map((startup: any) => (
                  <Card key={startup.id} className="glass-card hover:scale-105 transition-transform duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                              {(startup.name || "S").split(' ').map((n: string) => n[0] || "").join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg" data-testid={`startup-name-${startup.id}`}>
                              {startup.name}
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {startup.aiComponents?.[0] && (
                            <Badge variant="outline" data-testid={`startup-sector-${startup.id}`}>
                              {startup.aiComponents[0]}
                            </Badge>
                          )}
                          <Badge 
                            className={`${
                              startup.stage === 'pitch_ready' ? 'bg-green-400/20 text-green-400' :
                              startup.stage === 'mvp_build' ? 'bg-primary/20 text-primary' :
                              'bg-accent/20 text-accent'
                            }`}
                            data-testid={`startup-stage-${startup.id}`}
                          >
                            {(startup.stage || "ideation").replace(/_/g, ' ')}
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
                          <span className="text-muted-foreground">Readiness:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-2 bg-secondary rounded-full">
                              <div 
                                className="h-2 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                                style={{ width: `${startup.readinessScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="font-medium" data-testid={`startup-readiness-${startup.id}`}>
                              {startup.readinessScore || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div />
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            data-testid={`button-view-details-${startup.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          
                          <Dialog>
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
                                <DialogTitle>Request Meeting with {startup.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea 
                                  placeholder="Introduce yourself and explain your interest in this startup..."
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
                                  {requestMeeting.isPending ? "Sending..." : "Send Meeting Request"}
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
                  <Card key={investor.id} className="glass-card hover:scale-105 transition-transform duration-200">
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`investor-name-${investor.id}`}>
                        {investor.organization}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`investor-description-${investor.id}`}>
                        {investor.description}
                      </p>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Investment Focus</h4>
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
                            <span className="text-muted-foreground">Check Size:</span>
                            <p className="font-medium" data-testid={`investor-check-size-${investor.id}`}>
                              {investor.checkSize}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Portfolio:</span>
                            <p className="font-medium">{investor.portfolioSize} companies</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Notable Investments</h4>
                          <div className="flex flex-wrap gap-1">
                            {(investor.notableInvestments || []).map((investment: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {investment}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 pt-4 border-t border-border">
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
                          <Button 
                            size="sm"
                            onClick={() => setSelectedInvestorForBooking(investor)}
                            data-testid={`button-book-session-${investor.id}`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Book Session
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {((isInvestor && filteredStartups.length === 0) || (!isInvestor && filteredInvestors.length === 0)) && (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isInvestor ? "No startups found" : "No investors found"}
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            {/* Demo Days and Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Upcoming Demo Days</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Card className="bg-primary/10 border-primary/20">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2" data-testid="demo-day-title">
                          Q1 2025 Demo Day
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          12 startups presenting their AI innovations to top investors
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-primary font-medium">
                            March 15, 2025 • 2:00 PM PST
                          </span>
                          <Button size="sm" data-testid="button-register-demo-day">
                            Register
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-accent/10 border-accent/20">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">
                          AI Startup Showcase
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Monthly networking event with emerging AI startups
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-accent font-medium">
                            February 20, 2025 • 6:00 PM PST
                          </span>
                          <Button size="sm" variant="outline" data-testid="button-register-showcase">
                            RSVP
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>Past Success Stories</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white font-bold">
                        AI
                      </div>
                      <div>
                        <p className="font-medium">MedAI Diagnostics</p>
                        <p className="text-sm text-muted-foreground">
                          Raised $5M Series A • Sequoia Capital
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent to-green-400 rounded-lg flex items-center justify-center text-white font-bold">
                        AG
                      </div>
                      <div>
                        <p className="font-medium">AgriOptimize</p>
                        <p className="text-sm text-muted-foreground">
                          Raised $3M Seed • Andreessen Horowitz
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-400 rounded-lg flex items-center justify-center text-white font-bold">
                        FT
                      </div>
                      <div>
                        <p className="font-medium">FinTech AutoML</p>
                        <p className="text-sm text-muted-foreground">
                          Raised $2M Pre-Seed • Y Combinator
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
