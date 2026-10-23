import { useMemo, useState } from "react";
import { Link } from "wouter";
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
import type { Project, InvestorInterest } from "@shared/schema";

export default function InvestorDashboard() {
  // Fetch startup directory and interests
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: interests = [] } = useQuery<(InvestorInterest & { projectName?: string })[]>({
    queryKey: ["/api/investor/interests"],
  });

  // Fetch investor sessions
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/investor/sessions"],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  // One definition of "meetings scheduled", used by the metric card and the pipeline:
  // startups this investor has an interest at the meeting_scheduled stage for.
  const meetingsScheduled = interests.filter(i => i.level === "meeting_scheduled").length;

  // Real investor metrics based on available data
  const investorStats = {
    startupsViewed: projects.length, // Real count of available projects
    meetingsScheduled,
    activeDiligence: interests.filter(i => i.level === "diligence").length,
    portfolioInterest: interests.length, // Real count of interests
  };

  // Pipeline counts from this investor's recorded interests
  const pipeline = {
    initial: interests.filter(i => !i.level || i.level === "viewed" || i.level === "requested_info").length,
    meetings: meetingsScheduled,
    diligence: interests.filter(i => i.level === "diligence").length,
    decisions: interests.filter(i => i.level === "soft_commit" || i.level === "commit").length,
  };

  // Projects have no sector field; their primary AI component is used as the sector
  const sectorOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.aiComponents?.[0]).filter(Boolean) as string[])).sort(),
    [projects],
  );

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.trim().toLowerCase();
    const sector = project.aiComponents?.[0] || "";
    const matchesSearch = !query ||
      (project.name || "").toLowerCase().includes(query) ||
      (project.summary || "").toLowerCase().includes(query) ||
      (project.aiComponents || []).some((c) => c.toLowerCase().includes(query));
    const matchesSector = selectedSector === "all" || sector === selectedSector;
    const matchesStage = selectedStage === "all" || project.stage === selectedStage;
    return matchesSearch && matchesSector && matchesStage;
  });

  // Use real project data only, no synthetic values
  const featuredStartups = filteredProjects.slice(0, 6).map((project) => ({
    id: project.id,
    name: project.name || "Untitled Project",
    stage: project.stage || "ideation",
    sector: project.aiComponents?.[0],
    description: project.summary,
    readinessScore: project.readinessScore ?? 0,
    founded: project.createdAt ? new Date(project.createdAt).getFullYear().toString() : null
  }));

  const formatLevel = (level: string | null | undefined) =>
    (level || "viewed").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // Recent activity comes from this investor's recorded interests
  const recentActivity = [...interests]
    .sort((a, b) => new Date((b.updatedAt || b.createdAt || 0) as any).getTime() - new Date((a.updatedAt || a.createdAt || 0) as any).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Investor Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <p className="text-sm font-medium text-muted-foreground">Meetings Scheduled</p>
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-startups"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-40 bg-secondary border-border" data-testid="select-sector-filter">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectorOptions.map((sector) => (
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
                    <SelectItem value="ideation">Ideation</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="mvp_build">MVP Build</SelectItem>
                    <SelectItem value="pilot_traction">Pilot / Traction</SelectItem>
                    <SelectItem value="pitch_ready">Pitch Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Featured Startups */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Featured Startups</h2>
          <Button variant="outline" asChild data-testid="button-view-all-startups">
            <Link href="/investors">View All Directory</Link>
          </Button>
        </div>

        {featuredStartups.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {projects.length === 0 ? "No startups yet" : "No startups match your filters"}
              </h3>
              <p className="text-muted-foreground">
                {projects.length === 0
                  ? "Startups will appear here once participants create their projects."
                  : "Try adjusting your search or filters."}
              </p>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {featuredStartups.map((startup) => (
            <Card key={startup.id} className="glass-card hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        {startup.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg" data-testid={`startup-name-${startup.id}`}>
                        {startup.name}
                      </CardTitle>
                      {startup.founded && (
                        <p className="text-sm text-muted-foreground">
                          Since {startup.founded}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {startup.sector && (
                      <Badge variant="outline" data-testid={`startup-sector-${startup.id}`}>
                        {startup.sector}
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
                      {startup.stage.replace(/_/g, ' ')}
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
                  <div />
                  <div className="flex space-x-2">
                    <Button 
                      size="sm"
                      asChild
                      data-testid={`button-request-meeting-${startup.id}`}
                    >
                      <Link href="/investors">Request Meeting</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Scheduled Sessions */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Scheduled Sessions</h2>
        </div>
        
        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sessions.slice(0, 4).map((session: any) => (
              <Card key={session.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`session-title-${session.id}`}>
                        {session.title}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {session.sessionType && (
                          <Badge variant="outline" className="mr-2 capitalize">
                            {session.sessionType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {new Date(session.startTime).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Badge 
                      className={`${
                        new Date(session.startTime) > new Date() ? 'bg-primary/20 text-primary' : 'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {new Date(session.startTime) > new Date() ? 'Upcoming' : 'Past'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Participants:</span>
                      <p className="font-medium">{session.participantIds?.length || 0} participant(s)</p>
                    </div>
                    
                    {session.agenda && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Agenda:</span>
                        <p className="font-medium line-clamp-2" data-testid={`session-agenda-${session.id}`}>
                          {session.agenda}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Duration: {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))} minutes
                      </div>
                      <div className="flex space-x-2">
                        {new Date(session.startTime) > new Date() && session.meetingLink && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(session.meetingLink, '_blank')}
                            data-testid={`button-join-${session.id}`}
                          >
                            <Video className="w-3 h-3 mr-1" />
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sessions Scheduled</h3>
              <p className="text-muted-foreground">
                You don't have any upcoming sessions yet. Participants will request sessions with you through the platform.
              </p>
            </CardContent>
          </Card>
        )}
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
            <p className="text-sm text-muted-foreground" data-testid="events-empty">
              No demo days or events have been announced yet.
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="activity-empty">
                No activity yet. Request a meeting with a startup to start your pipeline.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3" data-testid={`activity-${activity.id}`}>
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{formatLevel(activity.level)}</span> {activity.projectName || "a startup"}
                      </p>
                      {(activity.updatedAt || activity.createdAt) && (
                        <p className="text-xs text-muted-foreground">
                          {new Date((activity.updatedAt || activity.createdAt) as any).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  <p className="text-2xl font-bold text-blue-400" data-testid="pipeline-initial">{pipeline.initial}</p>
                  <p className="text-sm text-muted-foreground">Initial Interest</p>
                </CardContent>
              </Card>
              
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent" data-testid="pipeline-meetings">{pipeline.meetings}</p>
                  <p className="text-sm text-muted-foreground">Meetings Scheduled</p>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-400/10 border-yellow-400/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400" data-testid="pipeline-diligence">{pipeline.diligence}</p>
                  <p className="text-sm text-muted-foreground">Due Diligence</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-400/10 border-green-400/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400" data-testid="pipeline-decisions">{pipeline.decisions}</p>
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
