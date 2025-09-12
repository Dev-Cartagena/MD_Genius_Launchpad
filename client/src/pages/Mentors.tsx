import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export default function Mentors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mentors
  const { data: mentors = [], isLoading } = useQuery({
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

  const displayMentors = mentors.length > 0 ? mentors : mockMentors;

  // Schedule session mutation
  const scheduleSession = useMutation({
    mutationFn: async ({ mentorId, timeSlot }: { mentorId: string; timeSlot: string }) => {
      const response = await apiRequest("POST", "/api/mentors/sessions", {
        mentorId,
        timeSlot,
        duration: 60
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Scheduled!",
        description: "Your mentor session has been scheduled. You'll receive a confirmation email shortly.",
      });
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to schedule session. Please try again.",
        variant: "destructive",
      });
    }
  });

  const filteredMentors = displayMentors.filter((mentor: any) => {
    const matchesSearch = searchQuery === "" || 
      mentor.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise.some((exp: string) => exp.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesExpertise = selectedExpertise === "all" || 
      mentor.expertise.includes(selectedExpertise);
    
    const matchesIndustry = selectedIndustry === "all" ||
      mentor.industries.includes(selectedIndustry);

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
          {filteredMentors.map((mentor: any) => (
            <Card key={mentor.id} className="glass-card hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={mentor.user.profileImageUrl} alt={`${mentor.user.firstName} ${mentor.user.lastName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-lg">
                      {mentor.user.firstName[0]}{mentor.user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`mentor-name-${mentor.id}`}>
                        {mentor.user.firstName} {mentor.user.lastName}
                      </CardTitle>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium" data-testid={`mentor-rating-${mentor.id}`}>
                          {mentor.rating}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{mentor.totalSessions} sessions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Responds {mentor.responseTime}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        mentor.isAvailable ? 'bg-green-400' : 'bg-yellow-400'
                      }`}></div>
                      <span className={`text-xs ${
                        mentor.isAvailable ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {mentor.isAvailable ? `Available ${mentor.nextAvailable}` : `Next available: ${mentor.nextAvailable}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed" data-testid={`mentor-bio-${mentor.id}`}>
                  {mentor.bio}
                </p>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Industries</h4>
                    <div className="flex flex-wrap gap-1">
                      {mentor.industries.map((industry: string, index: number) => (
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
                      onClick={() => window.open(mentor.linkedinUrl, '_blank')}
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
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        disabled={!mentor.isAvailable}
                        className={mentor.isAvailable ? "bg-primary" : ""}
                        data-testid={`button-schedule-${mentor.id}`}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Session with {mentor.user.firstName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Available Time Slots</label>
                          <Select>
                            <SelectTrigger className="w-full" data-testid={`select-timeslot-${mentor.id}`}>
                              <SelectValue placeholder="Select a time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today-3pm">Today 3:00 PM</SelectItem>
                              <SelectItem value="tomorrow-10am">Tomorrow 10:00 AM</SelectItem>
                              <SelectItem value="friday-2pm">Friday 2:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Session Topic</label>
                          <Textarea 
                            placeholder="What would you like to discuss in this session?"
                            className="mt-2"
                            data-testid={`textarea-session-topic-${mentor.id}`}
                          />
                        </div>
                        
                        <Button 
                          className="w-full"
                          onClick={() => scheduleSession.mutate({ 
                            mentorId: mentor.id, 
                            timeSlot: "today-3pm" 
                          })}
                          disabled={scheduleSession.isPending}
                          data-testid={`button-confirm-schedule-${mentor.id}`}
                        >
                          {scheduleSession.isPending ? "Scheduling..." : "Confirm Session"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
      </div>
    </AppLayout>
  );
}
