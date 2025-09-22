import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MentorProfile, MentorSession, User } from "@shared/schema";

// Extended mentor type for UI compatibility
type ExtendedMentor = (MentorProfile & { user: User }) & {
  // Optional UI fields for compatibility with mock data
  rating?: number;
  totalSessions?: number;
  responseTime?: string;
  isAvailable?: boolean;
  nextAvailable?: string;
  linkedinUrl?: string;
};
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Users,
  Search,
  Calendar,
  Star,
  MessageCircle,
  Video,
  Clock,
  Award,
  Filter,
  BookmarkPlus,
  Mail,
  LinkedinIcon,
  ExternalLink
} from "lucide-react";

// Session booking form schema
const sessionBookingSchema = z.object({
  title: z.string().min(5, "Session title must be at least 5 characters"),
  agenda: z.string().min(10, "Please provide at least 10 characters for the session agenda"),
  startTime: z.string().min(1, "Please select a start time"),
  duration: z.number().min(30, "Session must be at least 30 minutes").max(120, "Session cannot exceed 2 hours").default(60),
});

type SessionBookingFormData = z.infer<typeof sessionBookingSchema>;

// Session Booking Dialog Component
function SessionBookingDialog({ mentor, isOpen, onClose }: { 
  mentor: ExtendedMentor; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SessionBookingFormData>({
    resolver: zodResolver(sessionBookingSchema),
    defaultValues: {
      title: "",
      agenda: "",
      startTime: "",
      duration: 60,
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
    mutationFn: async (data: SessionBookingFormData) => {
      const endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60 * 1000).toISOString();
      
      return apiRequest("POST", "/api/sessions/book", {
        mentorId: mentor.id,
        title: data.title,
        agenda: data.agenda,
        startTime: data.startTime,
        endTime: endTime,
        participantIds: [], // Will be set by the API
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked!",
        description: `Your session with ${mentor.user.firstName} has been scheduled successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: "Failed to book session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SessionBookingFormData) => {
    bookSession.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Session with {mentor.user.firstName} {mentor.user.lastName}</DialogTitle>
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
                      placeholder="e.g., Product Strategy Discussion"
                      {...field}
                      data-testid={`input-session-title-${mentor.id}`}
                    />
                  </FormControl>
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
                      <SelectTrigger data-testid={`select-timeslot-${mentor.id}`}>
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
                      <SelectTrigger data-testid={`select-duration-${mentor.id}`}>
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
                      placeholder="What would you like to discuss in this session? Include specific questions or topics..."
                      className="min-h-[80px]"
                      {...field}
                      data-testid={`textarea-session-agenda-${mentor.id}`}
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
                data-testid={`button-cancel-booking-${mentor.id}`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bookSession.isPending}
                className="flex-1"
                data-testid={`button-confirm-booking-${mentor.id}`}
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

export default function Mentors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedMentorForBooking, setSelectedMentorForBooking] = useState<ExtendedMentor | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mentors with proper typing
  const { data: mentors = [], isLoading } = useQuery<ExtendedMentor[]>({
    queryKey: ["/api/mentors"],
  });

  // Mock mentor data with expertise and availability
  const mockMentors = [
    {
      id: "1",
      user: {
        id: "mentor-1",
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah.chen@example.com",
        profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b386?w=150&h=150&fit=crop&crop=face"
      },
      expertise: ["Product Strategy", "AI/ML", "Fundraising"],
      bio: "Former VP of Product at leading AI company. 10+ years experience building and scaling AI products. Specialized in go-to-market strategy for technical founders.",
      industries: ["HealthTech", "FinTech", "SaaS"],
      rating: 4.9,
      totalSessions: 45,
      responseTime: "< 2 hours",
      isAvailable: true,
      nextAvailable: "Today 3:00 PM",
      linkedinUrl: "https://linkedin.com/in/sarahchen"
    },
    {
      id: "2", 
      user: {
        id: "mentor-2",
        firstName: "Marcus",
        lastName: "Rodriguez",
        email: "marcus.rodriguez@example.com",
        profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      expertise: ["Technical Architecture", "Machine Learning", "Team Building"],
      bio: "CTO and Co-founder of successful AI startup (acquired by Google). Deep expertise in ML infrastructure and scaling technical teams.",
      industries: ["AgriTech", "CleanTech", "Enterprise AI"],
      rating: 4.8,
      totalSessions: 38,
      responseTime: "< 4 hours",
      isAvailable: true,
      nextAvailable: "Tomorrow 10:00 AM",
      linkedinUrl: "https://linkedin.com/in/marcusrodriguez"
    },
    {
      id: "3",
      user: {
        id: "mentor-3", 
        firstName: "Dr. Emily",
        lastName: "Watson",
        email: "emily.watson@example.com",
        profileImageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=150&h=150&fit=crop&crop=face"
      },
      expertise: ["AI Ethics", "Research Commercialization", "Academic Partnerships"],
      bio: "Former Stanford AI Research Director. Expert in responsible AI development and translating research into commercial applications.",
      industries: ["Healthcare", "Education", "Research"],
      rating: 5.0,
      totalSessions: 52,
      responseTime: "< 1 hour",
      isAvailable: false,
      nextAvailable: "Next week",
      linkedinUrl: "https://linkedin.com/in/emilywaston"
    },
    {
      id: "4",
      user: {
        id: "mentor-4",
        firstName: "David",
        lastName: "Kim", 
        email: "david.kim@example.com",
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      expertise: ["Business Development", "Sales Strategy", "Market Entry"],
      bio: "VP of Business Development at Fortune 500 tech company. Specialized in enterprise sales and strategic partnerships for AI startups.",
      industries: ["Enterprise", "B2B SaaS", "Infrastructure"],
      rating: 4.7,
      totalSessions: 29,
      responseTime: "< 6 hours",
      isAvailable: true,
      nextAvailable: "Friday 2:00 PM",
      linkedinUrl: "https://linkedin.com/in/davidkim"
    }
  ];

  // Use real mentors data only - no mock fallback in production
  const displayMentors = mentors;

  // Fetch participant's booked sessions
  const { data: mySessions = [] } = useQuery<MentorSession[]>({
    queryKey: ["/api/sessions/my"],
    enabled: !!user && user.role === 'participant'
  });

  const filteredMentors = displayMentors.filter((mentor) => {
    const matchesSearch = searchQuery === "" || 
      (mentor.user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.expertise?.some((exp: string) => exp.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);
    
    const matchesExpertise = selectedExpertise === "all" || 
      (mentor.expertise?.includes(selectedExpertise) ?? false);
    
    const matchesIndustry = selectedIndustry === "all" ||
      (mentor.industries?.includes(selectedIndustry) ?? false);

    return matchesSearch && matchesExpertise && matchesIndustry;
  });

  const expertiseOptions = [
    "Product Strategy", "Technical Architecture", "AI/ML", "Machine Learning",
    "Fundraising", "Business Development", "Team Building", "AI Ethics",
    "Research Commercialization", "Sales Strategy", "Market Entry"
  ];

  const industryOptions = [
    "HealthTech", "FinTech", "AgriTech", "CleanTech", "SaaS", "Enterprise AI",
    "Healthcare", "Education", "Research", "Enterprise", "B2B SaaS", "Infrastructure"
  ];

  if (isLoading) {
    return (
      <AppLayout title="Mentors" subtitle="Loading mentor directory...">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Mentors" 
      subtitle="Connect with industry experts and successful entrepreneurs"
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search mentors by name or expertise..." 
                    className="pl-10 bg-secondary border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-mentors"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={selectedExpertise} onValueChange={setSelectedExpertise}>
                  <SelectTrigger className="w-48 bg-secondary border-border" data-testid="select-expertise-filter">
                    <SelectValue placeholder="Expertise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Expertise</SelectItem>
                    {expertiseOptions.map((expertise) => (
                      <SelectItem key={expertise} value={expertise}>{expertise}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-48 bg-secondary border-border" data-testid="select-industry-filter">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" data-testid="button-advanced-filters">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="glass-card hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={mentor.user.profileImageUrl} alt={`${mentor.user.firstName ?? ''} ${mentor.user.lastName ?? ''}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg">
                      {((mentor.user.firstName ?? '')[0] ?? '') + ((mentor.user.lastName ?? '')[0] ?? '') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`mentor-name-${mentor.id}`}>
                        {(mentor.user.firstName ?? '')} {(mentor.user.lastName ?? '')}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium" data-testid={`mentor-rating-${mentor.id}`}>
                          {mentor.rating ?? '—'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{mentor.totalSessions ?? 0} sessions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Responds {mentor.responseTime ?? 'varies'}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        (mentor.isAvailable ?? false) ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></div>
                      <span className={`text-xs ${
                        (mentor.isAvailable ?? false) ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {(mentor.isAvailable ?? true) ? `Available ${mentor.nextAvailable ?? 'now'}` : `Next available: ${mentor.nextAvailable ?? 'TBD'}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed" data-testid={`mentor-bio-${mentor.id}`}>
                  {mentor.bio ?? "No bio available"}
                </p>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.expertise ?? []).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Industries</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.industries ?? []).map((industry: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // Sanitize LinkedIn URL for security
                        const url = mentor.linkedinUrl;
                        if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      data-testid={`button-linkedin-${mentor.id}`}
                    >
                      <LinkedinIcon className="w-3 h-3 mr-1" />
                      LinkedIn
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-contact-${mentor.id}`}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Contact
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Contact {mentor.user.firstName} {mentor.user.lastName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea 
                            placeholder="Introduce yourself and explain what you'd like to discuss..."
                            className="min-h-[100px]"
                            data-testid={`textarea-contact-message-${mentor.id}`}
                          />
                          <Button className="w-full" data-testid={`button-send-message-${mentor.id}`}>
                            Send Message
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <Button 
                    size="sm"
                    disabled={mentor.isAvailable === false}
                    className={(mentor.isAvailable ?? true) ? "bg-primary" : ""}
                    onClick={() => setSelectedMentorForBooking(mentor)}
                    data-testid={`button-schedule-${mentor.id}`}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Schedule Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMentors.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mentors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters to find mentors that match your needs.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Mentorship Guidelines */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Getting the Most from Mentorship</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Come Prepared</h4>
                <p className="text-sm text-muted-foreground">
                  Have specific questions and challenges ready to discuss. Share context about your project beforehand.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-accent" />
                </div>
                <h4 className="font-semibold mb-2">Be Responsive</h4>
                <p className="text-sm text-muted-foreground">
                  Respond promptly to mentor communications and follow through on action items discussed.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-400/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-green-400" />
                </div>
                <h4 className="font-semibold mb-2">Show Appreciation</h4>
                <p className="text-sm text-muted-foreground">
                  Acknowledge your mentor's time and expertise. Share updates on your progress and wins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Booking Dialog */}
        {selectedMentorForBooking && (
          <SessionBookingDialog
            mentor={selectedMentorForBooking}
            isOpen={!!selectedMentorForBooking}
            onClose={() => setSelectedMentorForBooking(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
