import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MentorSession, MentorWithProfile } from "@shared/schema";

// GET /api/mentors returns users with their mentor profile nested under `mentorProfile`
type ExtendedMentor = MentorWithProfile & {
  // Optional UI fields, not provided by the API yet
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
import { getApiErrorMessage } from "@/lib/utils";
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
        startTime: new Date(data.startTime).toISOString(),
        endTime: endTime,
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Booked!",
        description: `Your session with ${mentor.firstName} has been scheduled successfully.`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participant/sessions"] });
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

  const onSubmit = (data: SessionBookingFormData) => {
    bookSession.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Session with {mentor.firstName} {mentor.lastName}</DialogTitle>
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
  const isParticipant = user?.role === "participant";

  // Fetch mentors with proper typing
  const { data: mentors = [], isLoading } = useQuery<ExtendedMentor[]>({
    queryKey: ["/api/mentors"],
  });

  // Use real mentors data only - no mock fallback in production
  const displayMentors: ExtendedMentor[] = mentors.map((m) => ({
    ...m,
    isAvailable: m.isAvailable ?? m.mentorProfile?.isActive !== false,
  }));

  // Fetch participant's booked sessions
  const { data: mySessions = [] } = useQuery<MentorSession[]>({
    queryKey: ["/api/participant/sessions"],
    enabled: !!user && user.role === 'participant'
  });

  const filteredMentors = displayMentors.filter((mentor) => {
    const matchesSearch = searchQuery === "" || 
      (mentor.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (mentor.mentorProfile?.expertise?.some((exp: string) => exp.toLowerCase().includes(searchQuery.toLowerCase())) ?? false);
    
    const matchesExpertise = selectedExpertise === "all" || 
      (mentor.mentorProfile?.expertise?.includes(selectedExpertise) ?? false);
    
    const matchesIndustry = selectedIndustry === "all" ||
      (mentor.mentorProfile?.industries?.includes(selectedIndustry) ?? false);

    return matchesSearch && matchesExpertise && matchesIndustry;
  });

  // Filter options come from the mentors' actual profiles
  const expertiseOptions = Array.from(
    new Set(displayMentors.flatMap((m) => m.mentorProfile?.expertise ?? []))
  ).sort();

  const industryOptions = Array.from(
    new Set(displayMentors.flatMap((m) => m.mentorProfile?.industries ?? []))
  ).sort();

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
                    <AvatarImage src={mentor.profileImageUrl ?? undefined} alt={`${mentor.firstName ?? ''} ${mentor.lastName ?? ''}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg">
                      {((mentor.firstName ?? '')[0] ?? '') + ((mentor.lastName ?? '')[0] ?? '') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`mentor-name-${mentor.id}`}>
                        {(mentor.firstName ?? '')} {(mentor.lastName ?? '')}
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
                        mentor.isAvailable ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></div>
                      <span className={`text-xs ${
                        mentor.isAvailable ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {mentor.isAvailable ? `Available ${mentor.nextAvailable ?? 'now'}` : 'Not currently taking sessions'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed" data-testid={`mentor-bio-${mentor.id}`}>
                  {mentor.mentorProfile?.bio || mentor.bio || "No bio available"}
                </p>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.mentorProfile?.expertise ?? []).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Industries</h4>
                    <div className="flex flex-wrap gap-1">
                      {(mentor.mentorProfile?.industries ?? []).map((industry: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    {mentor.linkedinUrl && (
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
                    )}
                    
                  </div>
                  
                  {/* Only participants can book sessions (the server rejects other roles) */}
                  {isParticipant && (
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
                  )}
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
