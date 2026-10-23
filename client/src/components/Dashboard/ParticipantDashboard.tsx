import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { assignmentStatusClass, assignmentStatusLabel, isAssignmentDone } from "@/lib/roadmapStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ChatModal from "@/components/AICoach/ChatModal";
import { 
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  Users,
  FileText,
  Video,
  BookOpen,
  Target,
  CheckCircle2,
  Play,
  Map
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { Project, Cohort, Milestone, MentorSession, Application } from "@shared/schema";

// Shape returned by GET /api/projects/:id/roadmap
interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  week: number;
  orderIndex: number;
  estimatedHours: number | null;
  assignment: {
    id: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'waived' | null;
  } | null;
}

interface ProjectRoadmap {
  template: {
    id: string;
    name: string;
    description: string | null;
  };
  items: RoadmapItem[];
}

const STAGE_LABELS: Record<string, string> = {
  ideation: "Ideation",
  validation: "Validation",
  mvp_build: "MVP build",
  pilot_traction: "Pilot & traction",
  pitch_ready: "Pitch ready",
};

function stageLabel(stage: string | null | undefined): string {
  return stage ? STAGE_LABELS[stage] ?? stage : "Ideation";
}

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAiChat, setShowAiChat] = useState(false);

  // Fetch user projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects/my"],
  });

  // Fetch active cohorts
  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  // Accepted applications tell us the participant's cohort before a project exists
  const { data: myApplications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications/my"],
  });

  // Fetch participant sessions
  const { data: participantSessions = [], isLoading: sessionsLoading } = useQuery<MentorSession[]>({
    queryKey: ["/api/participant/sessions"],
  });

  // Get current project (first project or default)
  const hasProject = projects.length > 0;
  const currentProject: Pick<Project, "id" | "name" | "stage" | "summary" | "readinessScore" | "cohortId"> = projects[0] || {
    id: "",
    name: "No Project Yet",
    stage: "ideation",
    summary: "You haven't created a project yet. Start by defining your AI startup idea.",
    readinessScore: 0,
    cohortId: null,
  };

  // Fetch roadmap for the current project
  // The server returns null when no roadmap has been assigned yet
  const { data: roadmap, isLoading: roadmapLoading } = useQuery<ProjectRoadmap | null>({
    queryKey: ['/api/projects', currentProject.id, 'roadmap'],
    enabled: !!currentProject.id && currentProject.id !== ""
  });

  // Mutation to update roadmap assignment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      return apiRequest("PATCH", `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject.id, 'roadmap'] });
      toast({
        title: "Status Updated",
        description: "Roadmap item status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update roadmap item status.",
        variant: "destructive",
      });
    }
  });

  // Fetch milestones for user's cohort
  // The project's cohort, else the cohort of the participant's accepted application
  const acceptedCohortId = myApplications.find((app) => app.status === "accepted")?.cohortId;
  const userCohortId = currentProject.cohortId || acceptedCohortId;
  // Load the participant's own cohort by id: the public list only has active cohorts.
  const { data: ownCohort } = useQuery<Cohort>({
    queryKey: [`/api/cohorts/${userCohortId}`],
    enabled: Boolean(userCohortId),
  });
  const userCohort = ownCohort ?? cohorts.find((c: Cohort) => c.id === userCohortId);
  
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: [`/api/cohorts/${userCohort?.id}/milestones`],
    enabled: !!userCohort?.id,
  });

  // Fetch real user progress for cohort
  const { data: progressData, isLoading: progressLoading } = useQuery<{
    totalLessons: number;
    completedLessons: number;
    completionPercentage: number;
    moduleProgress: Array<{
      moduleId: string;
      moduleName: string;
      week: number;
      totalLessons: number;
      completedLessons: number;
      completionPercentage: number;
    }>;
  }>({
    queryKey: [`/api/progress/cohort/${userCohort?.id}`],
    enabled: !!userCohort?.id,
  });

  // Transform milestones for display (using real progress data)
  const milestonesWithProgress = milestones.map((milestone: Milestone, index: number) => {
    // Calculate milestone progress based on weeks and lesson completion
    const milestoneWeeks = Math.ceil((index + 1) * 2); // Each milestone spans ~2 weeks
    const relevantModules = progressData?.moduleProgress?.filter(mp => mp.week <= milestoneWeeks) || [];
    const milestoneCompletion = relevantModules.length > 0 
      ? Math.round(relevantModules.reduce((sum, mp) => sum + mp.completionPercentage, 0) / relevantModules.length)
      : 0;
    
    // Determine status based on completion
    const status = milestoneCompletion >= 100 ? "approved" 
                  : milestoneCompletion > 0 ? "in_progress" 
                  : "not_started";

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status,
      completion: milestoneCompletion,
      orderIndex: milestone.orderIndex,
    };
  });

  // Calculate current week from cohort dates
  const getCurrentWeek = () => {
    if (!userCohort?.startDate) return { current: 1, total: 8 };
    
    const now = new Date();
    const startDate = new Date(userCohort.startDate);
    const endDate = new Date(userCohort.endDate);
    
    const weeksPassed = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return { 
      current: Math.max(1, Math.min(weeksPassed, totalWeeks)), 
      total: totalWeeks 
    };
  };

  const { current: currentWeek, total: totalWeeks } = getCurrentWeek();

  // Helper functions for roadmap widget
  const handleStatusUpdate = (assignmentId: string, status: string) => {
    updateStatusMutation.mutate({ assignmentId, status });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'waived':
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = assignmentStatusClass;

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'lesson':
        return <BookOpen className="w-4 h-4" />;
      case 'task':
        return <Target className="w-4 h-4" />;
      case 'deliverable':
        return <FileText className="w-4 h-4" />;
      case 'mentor_session':
        return <Users className="w-4 h-4" />;
      case 'milestone':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  // Get current week's roadmap items
  const currentWeekRoadmapItems = roadmap?.items.filter(
    item => item.week === currentWeek
  ).sort((a, b) => a.orderIndex - b.orderIndex) || [];

  // Process upcoming sessions for display
  const getUpcomingSchedule = () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Filter sessions for this week
    const thisWeekSessions = participantSessions.filter(session => {
      const startTime = new Date(session.startTime);
      return startTime >= now && startTime <= oneWeekFromNow;
    });
    
    // Convert sessions to schedule format
    const sessionEvents = thisWeekSessions.map(session => ({
      id: session.id,
      title: session.title || "Mentor Session",
      description: session.agenda || "Mentoring session",
      time: formatSessionTime(session.startTime),
      type: "mentor" as const,
      sessionData: session
    }));
    
    return sessionEvents.slice(0, 3); // Limit to 3 items
  };
  
  const formatSessionTime = (startTime: string | Date) => {
    const date = new Date(startTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeDiff = sessionDate.getTime() - today.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (daysDiff === 0) return `Today ${timeStr}`;
    if (daysDiff === 1) return `Tomorrow ${timeStr}`;
    if (daysDiff < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${timeStr}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
  };
  
  const upcomingSchedule = getUpcomingSchedule();

  if (projectsLoading || milestonesLoading || progressLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Progress */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Program Progress</CardTitle>
              <span className="text-sm text-muted-foreground">
                {userCohort ? `${userCohort.name} • Week ${currentWeek} of ${totalWeeks}` : "No cohort yet"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Completion</span>
                <span className="text-accent font-medium" data-testid="progress-percentage">
                  {progressData?.completionPercentage ?? 0}%
                </span>
              </div>
              <Progress value={progressData?.completionPercentage ?? 0} className="h-3" data-testid="progress-bar" />
            </div>

            {/* Milestone Timeline */}
            <div className="space-y-4">
              {milestonesWithProgress.length === 0 && (
                <p className="text-sm text-muted-foreground">No milestones have been set for your cohort yet.</p>
              )}
              {milestonesWithProgress.map((milestone, index) => (
                <div key={milestone.id} className="flex items-center space-x-4" data-testid={`milestone-${milestone.id}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    milestone.status === 'approved' ? 'bg-accent animate-glow' :
                    milestone.status === 'in_progress' ? 'bg-primary animate-pulse-slow' :
                    'bg-secondary border-2 border-muted'
                  }`}>
                    {milestone.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-accent-foreground" />
                    ) : milestone.status === 'in_progress' ? (
                      <PlayCircle className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`milestone-title-${milestone.id}`}>
                      {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.status === 'approved' ? 'Completed' :
                       milestone.status === 'in_progress' ? 'In Progress' : 'Upcoming'} • {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                  <span className={`text-xs ${
                    milestone.status === 'approved' ? 'text-accent' :
                    milestone.status === 'in_progress' ? 'text-primary' :
                    'text-muted-foreground'
                  }`} data-testid={`milestone-completion-${milestone.id}`}>
                    {milestone.completion}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Venture Readiness Score */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Venture Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 progress-ring">
                  <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none"/>
                  <circle 
                    cx="48" 
                    cy="48" 
                    r="40" 
                    stroke="url(#gradient)" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * (currentProject.readinessScore || 0) / 100)} 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(262 80% 50%)"/>
                      <stop offset="100%" stopColor="hsl(183 100% 50%)"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold" data-testid="readiness-score">
                    {currentProject.readinessScore || 0}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              {hasProject
                ? "Your readiness score is updated by the program team as your project progresses."
                : "Create your project to start tracking venture readiness."}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Action Items and AI Coach */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This Week's Roadmap */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Map className="w-5 h-5 text-primary" />
                This Week's Roadmap
              </CardTitle>
              <Badge variant="outline" className="text-xs" data-testid="week-indicator">
                Week {currentWeek}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {roadmapLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : currentWeekRoadmapItems.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-sm font-medium mb-2">No Roadmap Items This Week</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {roadmap ? 'All caught up for this week!' : 'No roadmap assigned yet.'}
                </p>
                {!roadmap && (
                  <Link href="/roadmap">
                    <Button size="sm" variant="outline" data-testid="button-view-roadmap">
                      View Full Roadmap
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentWeekRoadmapItems.map((item) => (
                  <Card key={item.id} className="border-border" data-testid={`roadmap-item-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 mt-0.5">
                          {getItemTypeIcon(item.type)}
                          {getStatusIcon(item.assignment?.status || 'not_started')}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1" data-testid={`roadmap-title-${item.id}`}>
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.type.replace(/_/g, ' ')}
                            </Badge>
                            {(item.estimatedHours ?? 0) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ~{item.estimatedHours}h
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge className={getStatusColor(item.assignment?.status || 'not_started')}>
                            {assignmentStatusLabel(item.assignment?.status)}
                          </Badge>
                          
                          {item.assignment && (
                            <div className="flex gap-1">
                              {!isAssignmentDone(item.assignment.status) && (
                                <>
                                  {item.assignment.status !== 'in_progress' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(item.assignment!.id, 'in_progress')}
                                      disabled={updateStatusMutation.isPending}
                                      aria-label={`Start ${item.title}`}
                                      title="Start"
                                      data-testid={`button-start-${item.id}`}
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(item.assignment!.id, 'completed')}
                                    disabled={updateStatusMutation.isPending}
                                    aria-label={`Mark ${item.title} complete`}
                                    title="Mark complete"
                                    data-testid={`button-complete-${item.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {roadmap && (
                  <Link href="/roadmap">
                    <Button 
                      variant="outline" 
                      className="w-full mt-4 border-border hover:bg-secondary/80"
                      data-testid="button-view-full-roadmap"
                    >
                      View Full Roadmap
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Coach Integration */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Lightbulb className="w-5 h-5 text-accent" />
                <span>AI Coach</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow"></div>
                <span className="text-xs text-green-400">Online</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ask the AI Coach about program steps, ideation, technical questions, go-to-market or your pitch.
              It knows your project details.
            </p>
            <Button
              className="w-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              variant="outline"
              onClick={() => setShowAiChat(true)}
              data-testid="button-open-ai-coach"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Open AI Coach
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Current Project and Schedule */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Project Overview */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold" data-testid="project-name">
                Current Project: {currentProject.name}
              </CardTitle>
              <Badge className="bg-primary/20 text-primary" data-testid="project-stage">
                {hasProject ? `${stageLabel(currentProject.stage)} stage` : "Not started"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4" data-testid="project-summary">
              {currentProject.summary}
            </p>

            <Link href="/project">
              <Button variant="outline" size="sm" data-testid="button-open-project">
                {hasProject ? "Open Project" : "Create Your Project"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">This Week</CardTitle>
              {sessionsLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingSchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-sm font-medium mb-2">No Upcoming Events</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Your schedule is clear for this week. Consider booking a mentor session!
                </p>
                <Link href="/mentors">
                  <Button size="sm" variant="outline" data-testid="button-book-session">
                    Book Mentor Session
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSchedule.map((event) => (
                  <div key={event.id} className={`border-l-4 pl-3 ${
                    event.type === 'mentor' ? 'border-accent' :
                    event.type === 'workshop' ? 'border-primary' :
                    'border-yellow-400'
                  }`} data-testid={`schedule-${event.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm" data-testid={`schedule-title-${event.id}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                        <p className={`text-xs ${
                          event.type === 'mentor' ? 'text-accent' :
                          event.type === 'workshop' ? 'text-primary' :
                          'text-yellow-400'
                        }`}>
                          {event.time}
                        </p>
                      </div>
                      {event.sessionData.meetingLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          asChild
                          data-testid={`button-session-${event.id}`}
                        >
                          <a href={event.sessionData.meetingLink} target="_blank" rel="noopener noreferrer">
                            <Video className="w-3 h-3 mr-1" />
                            Join
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link href="/mentors">
              <Button
                variant="outline"
                className="w-full mt-4 border-border hover:bg-secondary/80"
                data-testid="button-view-calendar"
              >
                Mentors & Sessions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <ChatModal isOpen={showAiChat} onClose={() => setShowAiChat(false)} />
    </div>
  );
}
