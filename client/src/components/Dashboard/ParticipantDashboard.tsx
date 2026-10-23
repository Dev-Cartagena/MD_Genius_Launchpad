import { useState } from "react";
import { useTranslation } from "react-i18next";
import { intlLocale } from "@/i18n";
import { useLocalized } from "@/lib/localized";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isAssignmentDone } from "@/lib/roadmapStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ChatModal from "@/components/AICoach/ChatModal";
import { MistPanel, ProgressRing, StatusChip, ConnectorBadge, DropZone } from "@/components/brand";
import {
  Calendar,
  TrendingUp,
  Lightbulb,
  Users,
  FileText,
  Video,
  BookOpen,
  Target,
  CheckCircle2,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { projectStageEnum, roadmapItemTypeEnum } from "@shared/schema";
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
  translations?: unknown;
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

type ProjectStage = (typeof projectStageEnum.enumValues)[number];
type RoadmapItemType = (typeof roadmapItemTypeEnum.enumValues)[number];

const isStage = (v: string | null | undefined): v is ProjectStage =>
  (projectStageEnum.enumValues as readonly string[]).includes(v ?? "");
const isItemType = (v: string): v is RoadmapItemType =>
  (roadmapItemTypeEnum.enumValues as readonly string[]).includes(v);

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);
  const localized = useLocalized();
  const { toast } = useToast();
  const stageLabel = (stage: string | null | undefined) =>
    isStage(stage) ? t(`common:projectStage.${stage}`) : stage || t("common:projectStage.ideation");
  const itemTypeLabel = (type: string) =>
    isItemType(type) ? t(`common:itemType.${type}`) : type.replace(/_/g, " ");
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
    name: t("participant.defaultProject.name"),
    stage: "ideation",
    summary: t("participant.defaultProject.summary"),
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
        title: t("participant.toast.updated.title"),
        description: t("participant.toast.updated.description"),
      });
    },
    onError: () => {
      toast({
        title: t("participant.toast.updateFailed.title"),
        description: t("participant.toast.updateFailed.description"),
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
      title: localized.text(milestone, "title"),
      description: localized.text(milestone, "description"),
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
      title: session.title || t("sessions.defaultTitle"),
      description: session.agenda || t("sessions.defaultAgenda"),
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
    
    const timeStr = date.toLocaleTimeString(intlLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (daysDiff === 0) return t("sessions.today", { time: timeStr });
    if (daysDiff === 1) return t("sessions.tomorrow", { time: timeStr });
    if (daysDiff < 7) return t("sessions.dayTime", { day: date.toLocaleDateString(intlLocale(), { weekday: 'short' }), time: timeStr });
    return t("sessions.dayTime", { day: date.toLocaleDateString(intlLocale(), { month: 'short', day: 'numeric' }), time: timeStr });
  };
  
  const upcomingSchedule = getUpcomingSchedule();


  if (projectsLoading || milestonesLoading || progressLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
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
      {/* Next step: this week's roadmap, and venture readiness */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This Week's Roadmap */}
        <MistPanel className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm text-foreground/80">{t("participant.roadmap.eyebrow")}</p>
              <h2 className="font-display text-xl font-medium">{t("participant.roadmap.title")}</h2>
            </div>
            <Badge variant="outline" className="bg-card font-display text-xs" data-testid="week-indicator">
              {t("common:week", { week: currentWeek })}
            </Badge>
          </div>

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
            <DropZone className="bg-card/60 py-8">
              <p className="text-sm">
                {roadmap ? t("participant.roadmap.emptyWeek") : t("participant.roadmap.noRoadmap")}
              </p>
              {!roadmap && (
                <Link href="/roadmap">
                  <Button size="sm" variant="outline" className="mt-2" data-testid="button-view-roadmap">
                    {t("participant.roadmap.viewFull")}
                  </Button>
                </Link>
              )}
            </DropZone>
          ) : (
            <div className="space-y-3">
              {currentWeekRoadmapItems.map((item) => (
                <Card key={item.id} data-testid={`roadmap-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                          {getItemTypeIcon(item.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-display text-sm font-medium mb-1" data-testid={`roadmap-title-${item.id}`}>
                            {localized.text(item, "title")}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {localized.text(item, "description")}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{itemTypeLabel(item.type)}</span>
                            {(item.estimatedHours ?? 0) > 0 && (
                              <span>{t("participant.roadmap.hours", { hours: item.estimatedHours })}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusChip status={item.assignment?.status || 'not_started'} />

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
                                    aria-label={t("participant.roadmap.startItem", { title: localized.text(item, "title") })}
                                    title={t("participant.roadmap.start")}
                                    data-testid={`button-start-${item.id}`}
                                  >
                                    <Play className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(item.assignment!.id, 'completed')}
                                  disabled={updateStatusMutation.isPending}
                                  aria-label={t("participant.roadmap.completeItem", { title: localized.text(item, "title") })}
                                  title={t("participant.roadmap.complete")}
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
                    className="w-full mt-2 bg-card"
                    data-testid="button-view-full-roadmap"
                  >
                    {t("participant.roadmap.viewFull")}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </MistPanel>

        {/* Venture Readiness Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("participant.readiness.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <ProgressRing
                value={currentProject.readinessScore || 0}
                size={112}
                caption={t("participant.readiness.caption")}
                label={<span data-testid="readiness-score">{currentProject.readinessScore || 0}</span>}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {hasProject
                ? t("participant.readiness.hasProject")
                : t("participant.readiness.noProject")}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Program progress and schedule */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl">{t("participant.progress.title")}</CardTitle>
              <span className="font-display text-sm text-muted-foreground">
                {userCohort
                  ? t("participant.progress.cohortWeek", {
                      cohort: localized.text(userCohort, "name"),
                      week: t("common:weekOf", { week: currentWeek, total: totalWeeks }),
                    })
                  : t("participant.progress.noCohort")}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-display text-muted-foreground">{t("participant.progress.overall")}</span>
                <span className="font-display font-medium text-foreground" data-testid="progress-percentage">
                  {progressData?.completionPercentage ?? 0}%
                </span>
              </div>
              <Progress value={progressData?.completionPercentage ?? 0} className="h-2" data-testid="progress-bar" />
            </div>

            {/* Milestone Timeline */}
            <div className="space-y-4">
              {milestonesWithProgress.length === 0 && (
                <DropZone className="py-6">
                  <p className="text-sm">{t("participant.progress.noMilestones")}</p>
                </DropZone>
              )}
              {milestonesWithProgress.map((milestone, index) => (
                <div key={milestone.id} className="flex items-center gap-4" data-testid={`milestone-${milestone.id}`}>
                  <ConnectorBadge
                    state={
                      milestone.status === 'approved' ? 'done' :
                      milestone.status === 'in_progress' ? 'current' :
                      'upcoming'
                    }
                  >
                    {index + 1}
                  </ConnectorBadge>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium text-sm" data-testid={`milestone-title-${milestone.id}`}>
                      {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("participant.progress.milestoneMeta", {
                        status:
                          milestone.status === 'approved' ? t("participant.progress.completed") :
                          milestone.status === 'in_progress' ? t("participant.progress.inProgress") :
                          t("participant.progress.upcoming"),
                        date: milestone.dueDate
                          ? new Date(milestone.dueDate).toLocaleDateString(intlLocale())
                          : t("participant.progress.noDueDate"),
                      })}
                    </p>
                  </div>
                  <span className={`font-display text-sm ${
                    milestone.status === 'not_started' ? 'text-muted-foreground' : 'text-foreground'
                  }`} data-testid={`milestone-completion-${milestone.id}`}>
                    {milestone.completion}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t("participant.schedule.title")}</CardTitle>
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
              <DropZone className="py-8">
                <p className="text-sm">{t("participant.schedule.empty")}</p>
                <Link href="/mentors">
                  <Button size="sm" variant="outline" className="mt-2" data-testid="button-book-session">
                    {t("participant.schedule.book")}
                  </Button>
                </Link>
              </DropZone>
            ) : (
              <div className="space-y-4">
                {upcomingSchedule.map((event) => (
                  <div key={event.id} className="border-l-2 border-accent pl-3" data-testid={`schedule-${event.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-medium text-sm" data-testid={`schedule-title-${event.id}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                        <p className="font-display text-xs text-accent">
                          {event.time}
                        </p>
                      </div>
                      {event.sessionData.meetingLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          data-testid={`button-session-${event.id}`}
                        >
                          <a href={event.sessionData.meetingLink} target="_blank" rel="noopener noreferrer">
                            <Video className="w-3 h-3 mr-1" />
                            {t("sessions.join")}
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
                className="w-full mt-4"
                data-testid="button-view-calendar"
              >
                {t("participant.schedule.mentors")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Current project and AI Coach */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Project Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                {hasProject && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-medium text-primary-foreground" aria-hidden="true">
                    {currentProject.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <CardTitle className="text-xl min-w-0" data-testid="project-name">
                  {t("participant.project.title", { name: currentProject.name })}
                </CardTitle>
              </div>
              <Badge variant="secondary" data-testid="project-stage">
                {hasProject
                  ? t("participant.project.stage", { stage: stageLabel(currentProject.stage) })
                  : t("participant.project.notStarted")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4" data-testid="project-summary">
              {currentProject.summary}
            </p>

            <Link href="/project">
              <Button variant="outline" size="sm" data-testid="button-open-project">
                {hasProject ? t("participant.project.open") : t("participant.project.create")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* AI Coach Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="w-5 h-5 text-primary" />
              <span>{t("participant.coach.title")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("participant.coach.body")}
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowAiChat(true)}
              data-testid="button-open-ai-coach"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              {t("participant.coach.open")}
            </Button>
          </CardContent>
        </Card>
      </section>

      <ChatModal isOpen={showAiChat} onClose={() => setShowAiChat(false)} />
    </div>
  );
}
