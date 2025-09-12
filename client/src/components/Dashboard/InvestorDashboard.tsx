import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp,
  Eye,
  Calendar,
  DollarSign,
  Building,
  Users,
  Star,
  FileText,
  Video,
  MessageSquare,
  Filter,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvestorDashboard() {
  // Fetch startup directory and interests
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: interests = [] } = useQuery({
    queryKey: ["/api/investor/interests"],
  });

  // Mock investor metrics
  const investorStats = {
    startupsViewed: 42,
    meetingsScheduled: 8,
    activeDiligence: 3,
    portfolioInterest: 12,
    demoAttendance: 5
  };

  const featuredStartups = [
    {
      id: 1,
      name: "EcoAI Analytics",
      founder: "Alex Rodriguez",
      stage: "validation",
      sector: "CleanTech",
      description: "AI-powered sustainability analytics helping businesses reduce carbon footprint through intelligent optimization.",
      traction: "12 pilot customers, $50K ARR",
      fundingGoal: "$500K",
      readinessScore: 85,
      teamSize: 3,
      location: "San Francisco",
      founded: "2024"
    },
    {
      id: 2,
      name: "HealthTech AI",
      founder: "Sarah Kim",
      stage: "mvp_build",
      sector: "HealthTech",
      description: "Machine learning platform for early disease detection using medical imaging and biomarkers.",
      traction: "FDA approval pending, 2 hospital pilots",
      fundingGoal: "$1.2M",
      readinessScore: 78,
      teamSize: 5,
      location: "Boston",
      founded: "2023"
    },
    {
      id: 3,
      name: "AgriTech Optimizer",
      founder: "Michael Chen",
      stage: "pitch_ready",
      sector: "AgriTech",
      description: "Precision agriculture platform using computer vision and IoT for crop optimization.",
      traction: "500+ farms onboarded, $200K MRR",
      fundingGoal: "$2M",
      readinessScore: 92,
      teamSize: 8,
      location: "Austin",
      founded: "2022"
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      type: "demo_day",
      title: "Q1 2024 Demo Day",
      date: "March 15, 2024",
      time: "2:00 PM PST",
      startups: 12,
      registered: true
    },
    {
      id: 2,
      type: "meeting",
      title: "1:1 with EcoAI Analytics",
      date: "Tomorrow",
      time: "10:00 AM",
      startup: "EcoAI Analytics",
      confirmed: true
    },
    {
      id: 3,
      type: "pitch",
      title: "AgriTech Optimizer Pitch",
      date: "Friday",
      time: "3:00 PM",
      startup: "AgriTech Optimizer",
      confirmed: false
    }
  ];

  const recentActivity = [
    { id: 1, action: "Viewed", startup: "FinTech Analytics", time: "2 hours ago" },
    { id: 2, action: "Requested meeting", startup: "EcoAI Analytics", time: "1 day ago" },
    { id: 3, action: "Downloaded deck", startup: "HealthTech AI", time: "2 days ago" },
    { id: 4, action: "Attended demo", startup: "AgriTech Optimizer", time: "1 week ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Investor Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Startups Viewed</p>
                <p className="text-2xl font-bold" data-testid="metric-viewed">{investorStats.startupsViewed}</p>
              </div>
              <Eye className="w-6 h-6 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meetings</p>
                <p className="text-2xl font-bold" data-testid="metric-meetings">{investorStats.meetingsScheduled}</p>
              </div>
              <Calendar className="w-6 h-6 text-accent opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Diligence</p>
                <p className="text-2xl font-bold" data-testid="metric-diligence">{investorStats.activeDiligence}</p>
              </div>
              <FileText className="w-6 h-6 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portfolio Interest</p>
                <p className="text-2xl font-bold" data-testid="metric-portfolio">{investorStats.portfolioInterest}</p>
              </div>
              <Star className="w-6 h-6 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Demo Days</p>
                <p className="text-2xl font-bold" data-testid="metric-demos">{investorStats.demoAttendance}</p>
              </div>
              <Video className="w-6 h-6 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Search and Filters */}
      <section>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search startups by name, sector, or technology..." 
                    className="pl-10 bg-secondary border-border"
                    data-testid="input-search-startups"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select data-testid="select-sector-filter">
                  <SelectTrigger className="w-40 bg-secondary border-border">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="healthtech">HealthTech</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="cleantech">CleanTech</SelectItem>
                    <SelectItem value="agritech">AgriTech</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select data-testid="select-stage-filter">
                  <SelectTrigger className="w-40 bg-secondary border-border">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="ideation">Ideation</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="mvp_build">MVP Build</SelectItem>
                    <SelectItem value="pitch_ready">Pitch Ready</SelectItem>
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
      </section>

      {/* Featured Startups */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Featured Startups</h2>
          <Button variant="outline" data-testid="button-view-all-startups">
            View All Directory
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {featuredStartups.map((startup) => (
            <Card key={startup.id} className="glass-card hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={`/placeholder-startup-${startup.id}.jpg`} alt={startup.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        {startup.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg" data-testid={`startup-name-${startup.id}`}>
                        {startup.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        by {startup.founder}
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
                    <span className="font-medium" data-testid={`startup-traction-${startup.id}`}>
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
                      data-testid={`button-view-${startup.id}`}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      data-testid={`button-request-meeting-${startup.id}`}
                    >
                      Request Meeting
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Events and Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Upcoming Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-sm" data-testid={`event-title-${event.id}`}>
                            {event.title}
                          </p>
                          {event.type === 'demo_day' && (
                            <Badge className="bg-accent/20 text-accent">Demo Day</Badge>
                          )}
                          {event.type === 'meeting' && event.confirmed && (
                            <Badge className="bg-green-400/20 text-green-400">Confirmed</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center space-x-1">
                            <span data-testid={`event-date-${event.id}`}>{event.date}</span>
                            <span>•</span>
                            <span data-testid={`event-time-${event.id}`}>{event.time}</span>
                          </p>
                          
                          {event.startups && (
                            <p>{event.startups} startups presenting</p>
                          )}
                          
                          {event.startup && (
                            <p>with {event.startup}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        {event.type === 'demo_day' && (
                          <Button 
                            size="sm" 
                            className={event.registered ? "bg-green-400" : "bg-primary"}
                            data-testid={`button-event-${event.id}`}
                          >
                            {event.registered ? "Registered" : "Register"}
                          </Button>
                        )}
                        
                        {event.type === 'meeting' && (
                          <Button 
                            size="sm" 
                            variant={event.confirmed ? "outline" : "default"}
                            data-testid={`button-meeting-${event.id}`}
                          >
                            <Video className="w-3 h-3 mr-1" />
                            {event.confirmed ? "Join" : "Confirm"}
                          </Button>
                        )}
                        
                        {event.type === 'pitch' && (
                          <Button 
                            size="sm"
                            data-testid={`button-pitch-${event.id}`}
                          >
                            Attend
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3" data-testid={`activity-${activity.id}`}>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.action === 'Viewed' ? 'bg-primary' :
                    activity.action === 'Requested meeting' ? 'bg-accent' :
                    activity.action === 'Downloaded deck' ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span> {activity.startup}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4"
              data-testid="button-view-all-activity"
            >
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Investment Pipeline */}
      <section>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Investment Pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-400/10 border-blue-400/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400" data-testid="pipeline-initial">8</p>
                  <p className="text-sm text-muted-foreground">Initial Interest</p>
                </CardContent>
              </Card>
              
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent" data-testid="pipeline-meetings">5</p>
                  <p className="text-sm text-muted-foreground">Meetings Scheduled</p>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-400/10 border-yellow-400/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400" data-testid="pipeline-diligence">3</p>
                  <p className="text-sm text-muted-foreground">Due Diligence</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-400/10 border-green-400/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400" data-testid="pipeline-decisions">1</p>
                  <p className="text-sm text-muted-foreground">Investment Decisions</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
