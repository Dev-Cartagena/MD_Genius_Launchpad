import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MistPanel, DropZone } from "@/components/brand";
import {
  TrendingUp,
  Calendar,
  Building,
  Star,
  FileText,
  Video,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, InvestorInterest } from "@shared/schema";

const STAGE_LABELS: Record<string, string> = {
  ideation: "Ideation",
  validation: "Validation",
  mvp_build: "MVP build",
  pilot_traction: "Pilot and traction",
  pitch_ready: "Pitch ready",
};

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
    name: project.name || "Untitled project",
    stage: project.stage || "ideation",
    sector: project.aiComponents?.[0],
    description: project.summary,
    readinessScore: project.readinessScore ?? 0,
    founded: project.createdAt ? new Date(project.createdAt).getFullYear().toString() : null
  }));

  const formatLevel = (level: string | null | undefined) =>
    (level || "viewed").replace(/_/g, " ").replace(/^\w/, (l) => l.toUpperCase());

  // Recent activity comes from this investor's recorded interests
  const recentActivity = [...interests]
    .sort((a, b) => new Date((b.updatedAt || b.createdAt || 0) as any).getTime() - new Date((a.updatedAt || a.createdAt || 0) as any).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Investor Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Startups in directory" value={investorStats.startupsViewed} icon={Building} testId="metric-viewed" />
        <KpiCard label="Meetings scheduled" value={investorStats.meetingsScheduled} icon={Calendar} testId="metric-meetings" />
        <KpiCard label="Due diligence" value={investorStats.activeDiligence} icon={FileText} testId="metric-diligence" />
        <KpiCard label="Startups of interest" value={investorStats.portfolioInterest} icon={Star} testId="metric-portfolio" />
      </section>

      {/* Scheduled Sessions (next step) */}
      <MistPanel>
        <div className="mb-5">
          <p className="font-display text-sm text-foreground/80">Your next meetings</p>
          <h2 className="font-display text-xl font-medium">Scheduled sessions</h2>
        </div>

        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sessions.slice(0, 4).map((session: any) => (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base" data-testid={`session-title-${session.id}`}>
                        {session.title}
                      </CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-2 font-display text-sm text-muted-foreground">
                        {session.sessionType && (
                          <Badge variant="outline" className="capitalize">
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
                    <Badge variant={new Date(session.startTime) > new Date() ? 'secondary' : 'outline'}>
                      {new Date(session.startTime) > new Date() ? 'Upcoming' : 'Past'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-display text-muted-foreground">Participants</span>
                      <p className="font-medium">{session.participantIds?.length || 0} {(session.participantIds?.length || 0) === 1 ? 'participant' : 'participants'}</p>
                    </div>

                    {session.agenda && (
                      <div className="text-sm">
                        <span className="font-display text-muted-foreground">Agenda</span>
                        <p className="line-clamp-2" data-testid={`session-agenda-${session.id}`}>
                          {session.agenda}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                      <div className="font-display text-xs text-muted-foreground">
                        {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))} minutes
                      </div>
                      <div className="flex gap-2">
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
          <DropZone className="bg-card/60 py-8">
            <p className="text-sm">Sessions will appear here when participants request time with you.</p>
          </DropZone>
        )}
      </MistPanel>

      {/* Search and Filters */}
      <section>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search startups by name, sector or technology"
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-startups"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:flex">
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="w-full md:w-40" data-testid="select-sector-filter">
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sectors</SelectItem>
                    {sectorOptions.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-full md:w-40" data-testid="select-stage-filter">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    <SelectItem value="ideation">Ideation</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="mvp_build">MVP build</SelectItem>
                    <SelectItem value="pilot_traction">Pilot and traction</SelectItem>
                    <SelectItem value="pitch_ready">Pitch ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Featured Startups */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-xl font-medium">Featured startups</h2>
          <Button variant="outline" asChild data-testid="button-view-all-startups">
            <Link href="/investors">View all</Link>
          </Button>
        </div>

        {featuredStartups.length === 0 && (
          <DropZone className="py-10">
            <p className="text-sm">
              {projects.length === 0
                ? "Startups will appear here once participants create their projects."
                : "No startups match your search. Try adjusting the filters."}
            </p>
          </DropZone>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {featuredStartups.map((startup) => (
            <Card key={startup.id} className="flex flex-col transition-colors hover:border-accent/50">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-base font-medium text-primary-foreground" aria-hidden="true">
                      {startup.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg" data-testid={`startup-name-${startup.id}`}>
                        {startup.name}
                      </CardTitle>
                      {startup.founded && (
                        <p className="font-display text-sm text-muted-foreground">
                          Since {startup.founded}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {startup.sector && (
                      <Badge variant="outline" data-testid={`startup-sector-${startup.id}`}>
                        {startup.sector}
                      </Badge>
                    )}
                    <Badge variant="secondary" data-testid={`startup-stage-${startup.id}`}>
                      {STAGE_LABELS[startup.stage] ?? startup.stage.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`startup-description-${startup.id}`}>
                  {startup.description}
                </p>

                <div className="mb-4 mt-auto flex items-center justify-between gap-3 text-sm">
                  <span className="font-display text-muted-foreground">Readiness</span>
                  <div className="flex items-center gap-2">
                    <Progress value={startup.readinessScore} className="h-1.5 w-16" />
                    <span className="font-display font-medium" data-testid={`startup-readiness-${startup.id}`}>
                      {startup.readinessScore}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <Button
                    size="sm"
                    asChild
                    data-testid={`button-request-meeting-${startup.id}`}
                  >
                    <Link href="/investors">Request meeting</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Events and Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Upcoming events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DropZone className="py-6">
              <p className="text-sm" data-testid="events-empty">
                No demo days or events have been announced yet.
              </p>
            </DropZone>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <DropZone className="py-6">
                <p className="text-sm" data-testid="activity-empty">
                  Request a meeting with a startup to start your pipeline.
                </p>
              </DropZone>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3" data-testid={`activity-${activity.id}`}>
                    <div className="h-2 w-2 shrink-0 rounded-full bg-accent"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-display font-medium">{formatLevel(activity.level)}</span> {activity.projectName || "a startup"}
                      </p>
                      {(activity.updatedAt || activity.createdAt) && (
                        <p className="font-display text-xs text-muted-foreground">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Investment pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Initial interest", value: pipeline.initial, testId: "pipeline-initial" },
                { label: "Meetings scheduled", value: pipeline.meetings, testId: "pipeline-meetings" },
                { label: "Due diligence", value: pipeline.diligence, testId: "pipeline-diligence" },
                { label: "Investment decisions", value: pipeline.decisions, testId: "pipeline-decisions" },
              ].map((stage, index) => (
                <div key={stage.testId} className="rounded-lg border border-border p-4">
                  <p className="font-display text-xs text-muted-foreground">Stage {index + 1}</p>
                  <p className="mt-1 font-display text-3xl font-medium text-foreground" data-testid={stage.testId}>{stage.value}</p>
                  <p className="font-display text-sm text-muted-foreground">{stage.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, testId }: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-medium text-foreground" data-testid={testId}>{value}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
