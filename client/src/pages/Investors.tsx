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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
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

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedTab, setSelectedTab] = useState("directory");
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

  // Mock startup data for directory
  const mockStartups = [
    {
      id: "1",
      name: "EcoAI Analytics",
      founder: {
        firstName: "Alex",
        lastName: "Rodriguez",
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      },
      stage: "validation",
      sector: "CleanTech",
      description: "AI-powered sustainability analytics platform helping businesses reduce their carbon footprint through intelligent resource optimization and predictive modeling.",
      traction: "12 pilot customers, $50K ARR",
      fundingGoal: "$500K",
      readinessScore: 85,
      teamSize: 3,
      location: "San Francisco",
      founded: "2025",
      aiComponents: ["Machine Learning", "Predictive Analytics", "Computer Vision"],
      isPublic: true,
      hasNDA: false
    },
    {
      id: "2",
      name: "HealthTech AI",
      founder: {
        firstName: "Sarah",
        lastName: "Kim",
        profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b386?w=150&h=150&fit=crop&crop=face"
      },
      stage: "mvp_build",
      sector: "HealthTech",
      description: "Machine learning platform for early disease detection using medical imaging and biomarkers. Helping healthcare providers improve patient outcomes through AI-powered diagnostics.",
      traction: "FDA approval pending, 2 hospital pilots",
      fundingGoal: "$1.2M",
      readinessScore: 78,
      teamSize: 5,
      location: "Boston",
      founded: "2023",
      aiComponents: ["Deep Learning", "Computer Vision", "Medical AI"],
      isPublic: true,
      hasNDA: true
    },
    {
      id: "3",
      name: "AgriTech Optimizer",
      founder: {
        firstName: "Michael",
        lastName: "Chen",
        profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      stage: "pitch_ready",
      sector: "AgriTech",
      description: "Precision agriculture platform using computer vision and IoT sensors for crop optimization. Helping farmers increase yields while reducing environmental impact.",
      traction: "500+ farms onboarded, $200K MRR",
      fundingGoal: "$2M",
      readinessScore: 92,
      teamSize: 8,
      location: "Austin",
      founded: "2022",
      aiComponents: ["Computer Vision", "IoT Analytics", "Predictive Modeling"],
      isPublic: true,
      hasNDA: false
    }
  ];

  // Mock investor data
  const mockInvestors = [
    {
      id: "1",
      organization: "TechVentures AI Fund",
      contactEmail: "partners@techventures.com",
      sectors: ["AI/ML", "HealthTech", "FinTech"],
      stages: ["Seed", "Series A"],
      geography: ["North America", "Europe"],
      checkSize: "$250K - $2M",
      portfolioSize: 45,
      notableInvestments: ["OpenAI", "Anthropic", "Stability AI"],
      description: "Leading AI-focused venture fund investing in transformative artificial intelligence companies.",
      website: "https://techventures.com"
    },
    {
      id: "2",
      organization: "Green Impact Ventures",
      contactEmail: "team@greenimpact.vc",
      sectors: ["CleanTech", "Sustainability", "Climate"],
      stages: ["Pre-Seed", "Seed"],
      geography: ["Global"],
      checkSize: "$100K - $1M",
      portfolioSize: 32,
      notableInvestments: ["Tesla Energy", "Beyond Meat", "Impossible Foods"],
      description: "Climate-focused venture capital firm backing companies solving environmental challenges.",
      website: "https://greenimpact.vc"
    }
  ];

  const displayStartups = projects.length > 0 ? projects : mockStartups;
  const displayInvestors = investors.length > 0 ? investors : mockInvestors;

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
        description: "Failed to request meeting. Please try again.",
        variant: "destructive",
      });
    }
  });

  const filteredStartups = displayStartups.filter((startup: any) => {
    const matchesSearch = searchQuery === "" || 
      startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      startup.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      startup.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSector === "all" || startup.sector === selectedSector;
    const matchesStage = selectedStage === "all" || startup.stage === selectedStage;

    return matchesSearch && matchesSector && matchesStage;
  });

  const filteredInvestors = displayInvestors.filter((investor: any) => {
    const matchesSearch = searchQuery === "" ||
      investor.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.sectors.some((sector: string) => sector.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const sectors = ["AI/ML", "HealthTech", "FinTech", "CleanTech", "AgriTech", "EdTech", "Enterprise"];
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
                            <AvatarImage src={startup.founder.profileImageUrl} alt={startup.name} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                              {startup.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg" data-testid={`startup-name-${startup.id}`}>
                              {startup.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              by {startup.founder.firstName} {startup.founder.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant="outline" data-testid={`startup-sector-${startup.id}`}>
                            {startup.sector}
                          </Badge>
                          <Badge 
                            className={`${
                              startup.stage === 'pitch_ready' ? 'bg-green-400/20 text-green-400' :
                              startup.stage === 'mvp_build' ? 'bg-primary/20 text-primary' :
                              'bg-accent/20 text-accent'
                            }`}
                            data-testid={`startup-stage-${startup.id}`}
                          >
                            {startup.stage.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`startup-description-${startup.id}`}>
                        {startup.description}
                      </p>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Traction:</span>
                          <span className="font-medium text-right" data-testid={`startup-traction-${startup.id}`}>
                            {startup.traction}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Seeking:</span>
                          <span className="font-medium text-green-400" data-testid={`startup-funding-${startup.id}`}>
                            {startup.fundingGoal}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Readiness:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-2 bg-secondary rounded-full">
                              <div 
                                className="h-2 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                                style={{ width: `${startup.readinessScore}%` }}
                              ></div>
                            </div>
                            <span className="font-medium" data-testid={`startup-readiness-${startup.id}`}>
                              {startup.readinessScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{startup.teamSize} team</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Building className="w-3 h-3" />
                            <span>{startup.location}</span>
                          </span>
                        </div>
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
                                  data-testid={`textarea-meeting-request-${startup.id}`}
                                />
                                <Button 
                                  className="w-full"
                                  onClick={() => requestMeeting.mutate({ 
                                    startupId: startup.id, 
                                    message: "Meeting request" 
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
                            {investor.sectors.map((sector: string, index: number) => (
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
                            {investor.notableInvestments.map((investment: string, index: number) => (
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
                            onClick={() => window.open(investor.website, '_blank')}
                            data-testid={`button-website-${investor.id}`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Website
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => window.open(`mailto:${investor.contactEmail}`, '_blank')}
                            data-testid={`button-contact-investor-${investor.id}`}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Contact
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
    </AppLayout>
  );
}
