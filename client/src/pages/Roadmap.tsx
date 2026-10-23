import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localized";
import { intlLocale, type resources } from "@/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  countAssignmentStatuses,
  isAssignmentDone,
} from "@/lib/roadmapStatus";
import { ConnectorBadge, MistPanel, ProgressRing, StatusChip } from "@/components/brand";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Ban,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  Play,
  BookOpen,
  Target,
  FileText,
  Users,
  Calendar,
  TrendingUp
} from "lucide-react";

type CommonItemType = keyof (typeof resources)["en"]["common"]["itemType"];
type ExtraItemType = keyof (typeof resources)["en"]["roadmap"]["itemType"];
const COMMON_ITEM_TYPES = ["task", "assignment", "deliverable", "milestone", "checkin", "learning"] as const;
const EXTRA_ITEM_TYPES = ["lesson", "mentor_session"] as const;

interface RoadmapItemWithAssignment {
  id: string;
  translations?: unknown;
  title: string;
  description: string;
  type: string;
  week: number;
  orderIndex: number;
  estimatedHours: number;
  autoCompletionType: string;
  assignment?: {
    id: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'waived';
    dueDate?: string;
    autoCompleted?: boolean;
  };
  lesson?: {
    id: string;
    title: string;
    translations?: unknown;
    content?: string;
  };
  module?: {
    id: string;
    title: string;
    translations?: unknown;
    description?: string;
    week?: number;
  };
  progressData?: {
    type: 'lesson' | 'module';
    isCompleted: boolean;
    completedAt?: string;
    score?: number;
    timeSpent?: number;
    totalLessons?: number;
    completedLessons?: number;
    completionRate?: number;
  };
  milestone?: {
    id: string;
    title: string;
  };
}

interface ProjectRoadmap {
  template: {
    id: string;
    name: string;
    description: string | null;
    translations?: unknown;
  };
  items: RoadmapItemWithAssignment[];
}

export default function Roadmap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(["roadmap", "common"]);
  const localized = useLocalized();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // Get user's project ID (assuming participant has one project)
  const { data: projects, isLoading: projectsLoading } = useQuery<Array<{ id: string; title: string; ownerId: string }>>({
    queryKey: ['/api/projects/my'],
    enabled: !!user && user.role === 'participant'
  });

  const projectId = projects && projects.length > 0 ? projects[0].id : undefined;

  // Fetch roadmap for the project
  const { data: roadmap, isLoading } = useQuery<ProjectRoadmap | null>({
    queryKey: ['/api/projects', projectId, 'roadmap'],
    enabled: !!projectId
  });

  // Mutation to update assignment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      return apiRequest("PATCH", `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'roadmap'] });
      toast({
        title: t("toast.updated.title"),
        description: t("toast.updated.description"),
      });
    },
    onError: () => {
      toast({
        title: t("toast.updateFailed.title"),
        description: t("toast.updateFailed.description"),
        variant: "destructive",
      });
    }
  });

  const handleStatusUpdate = (assignmentId: string, status: string) => {
    updateStatusMutation.mutate({ assignmentId, status });
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'lesson':
      case 'learning':
        return <BookOpen className="w-4 h-4" />;
      case 'task':
        return <Target className="w-4 h-4" />;
      case 'assignment':
        return <FileText className="w-4 h-4" />;
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

  // Stored item types stay as they are; only the label is translated.
  const itemTypeLabel = (itemType: string) => {
    if ((COMMON_ITEM_TYPES as readonly string[]).includes(itemType)) {
      return t(`common:itemType.${itemType as CommonItemType}`);
    }
    if ((EXTRA_ITEM_TYPES as readonly string[]).includes(itemType)) {
      return t(`itemType.${itemType as ExtraItemType}`);
    }
    return itemType.replace(/_/g, ' ');
  };

  const isLearningItem = (item: RoadmapItemWithAssignment) => {
    return item.autoCompletionType === 'lesson' || item.autoCompletionType === 'module' || item.lesson || item.module;
  };

  const getCurriculumLink = (item: RoadmapItemWithAssignment) => {
    if (item.lesson) {
      return `/curriculum?lesson=${item.lesson.id}`;
    } else if (item.module) {
      return `/curriculum?module=${item.module.id}`;
    }
    return '/curriculum';
  };

  const getProgressDisplay = (item: RoadmapItemWithAssignment) => {
    if (!item.progressData) return null;

    if (item.progressData.type === 'lesson') {
      return (
        <div className="text-xs text-muted-foreground">
          {item.progressData.isCompleted ? t('common:assignmentStatus.completed') : t('common:assignmentStatus.not_started')}
          {item.progressData.score && ` • ${t('progress.score', { score: item.progressData.score })}`}
        </div>
      );
    } else if (item.progressData.type === 'module') {
      const { completedLessons = 0, totalLessons = 0, completionRate = 0 } = item.progressData;
      return (
        <div className="text-xs text-muted-foreground">
          {t('progress.module', { count: totalLessons, completed: completedLessons, percent: Math.round(completionRate) })}
        </div>
      );
    }
    return null;
  };

  if (!user || user.role !== 'participant') {
    return (
      <AppLayout title={t("common:nav.roadmap")}>
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t("restricted")}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (projectsLoading) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("page.subtitle")}>
        <div className="md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!projectId) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("page.subtitle")}>
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t("noProject")}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("page.subtitle")}>
        <div className="md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-1/4 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!roadmap || !roadmap.items.length) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("page.subtitle")}>
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="text-lg mb-2">{t("empty.title")}</h3>
              <p className="text-muted-foreground">
                {t("empty.body")}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Group items by week
  const itemsByWeek = roadmap.items.reduce((acc, item) => {
    const week = item.week;
    if (!acc[week]) acc[week] = [];
    acc[week].push(item);
    return acc;
  }, {} as Record<number, RoadmapItemWithAssignment[]>);

  // Calculate progress statistics
  const counts = countAssignmentStatuses(roadmap.items.map(item => item.assignment?.status));
  const totalItems = counts.total;
  const doneItems = counts.done;
  const progressPercentage = totalItems > 0 ? (doneItems / totalItems) * 100 : 0;

  const weeks = Object.keys(itemsByWeek).map(Number).sort((a, b) => a - b);

  // Timeline states: a week is done when all its items are done;
  // the first week that is not done is the current one.
  const isWeekDone = (week: number) =>
    (itemsByWeek[week] || []).every(item => isAssignmentDone(item.assignment?.status));
  const currentTimelineWeek = weeks.find(week => !isWeekDone(week));
  const weekState = (week: number): "done" | "current" | "upcoming" => {
    if (isWeekDone(week)) return "done";
    if (week === currentTimelineWeek) return "current";
    return "upcoming";
  };

  const statTiles = [
    { key: "completed", label: t("common:assignmentStatus.completed"), value: counts.completed },
    { key: "waived", label: t("common:assignmentStatus.waived"), value: counts.waived },
    { key: "in_progress", label: t("common:assignmentStatus.in_progress"), value: counts.inProgress },
    { key: "blocked", label: t("common:assignmentStatus.blocked"), value: counts.blocked },
    { key: "pending", label: t("stats.pending"), value: counts.pending },
  ];

  return (
    <AppLayout title={t("page.title")} subtitle={t("page.subtitle")}>
      <div className="md:p-6 space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {localized.text(roadmap.template, "name")}
            </CardTitle>
            {roadmap.template.description && (
              <p className="text-muted-foreground">{localized.text(roadmap.template, "description")}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <ProgressRing
                value={progressPercentage}
                size={112}
                caption={t("stats.doneOf", { done: doneItems, total: totalItems })}
                className="self-center sm:self-auto"
              />
              <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-xl border border-border bg-border">
                {statTiles.map((tile, i) => (
                  <div
                    key={tile.key}
                    className={cn("bg-card p-3", i === statTiles.length - 1 && "col-span-2 lg:col-span-1")}
                  >
                    <div
                      className={cn(
                        "font-display text-3xl font-medium",
                        tile.key === "blocked" && tile.value > 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {tile.value}
                    </div>
                    <div className="font-display text-sm text-muted-foreground">{tile.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedWeek === null ? "default" : "outline"}
            onClick={() => setSelectedWeek(null)}
            className="whitespace-nowrap"
            data-testid="button-all-weeks"
          >
            {t("weeks.all")}
          </Button>
          {weeks.map((week) => (
            <Button
              key={week}
              variant={selectedWeek === week ? "default" : "outline"}
              onClick={() => setSelectedWeek(week)}
              className="whitespace-nowrap"
              data-testid={`button-week-${week}`}
            >
              {t("common:week", { week })}
            </Button>
          ))}
        </div>

        {/* Roadmap Items: week timeline on a hairline */}
        <ol className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-primary/20 before:content-['']">
          {weeks
            .filter(week => selectedWeek === null || week === selectedWeek)
            .map((week) => {
            const state = weekState(week);
            const weekItems = itemsByWeek[week] || [];
            const doneCount = weekItems.filter(item => isAssignmentDone(item.assignment?.status)).length;
            const WeekPanel = state === "current" ? MistPanel : "div";
            return (
            <li key={week} className="relative flex gap-3 sm:gap-4">
              <ConnectorBadge state={state} className="mt-4">{week}</ConnectorBadge>
              <WeekPanel
                className={cn(
                  "min-w-0 flex-1 p-0",
                  state !== "current" && "panel",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
                  <h3 className="font-display text-lg font-medium">{t("common:week", { week })}</h3>
                  {state === "current" && (
                    <span className="font-display text-xs text-accent">{t("weeks.current")}</span>
                  )}
                  <span className={cn("ml-auto font-display text-sm", state === "current" ? "text-foreground/80" : "text-muted-foreground")}>
                    {t("weeks.done", { done: doneCount, total: weekItems.length })}
                  </span>
                </div>
                <div className={cn("divide-y divide-border", state === "current" && "rounded-b-xl bg-card")}>
                  {weekItems
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-4 sm:px-6"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-secondary text-primary flex items-center justify-center">
                          {getItemTypeIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{localized.text(item, "title")}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{localized.text(item, "description")}</p>
                          )}

                          {/* Learning item specific info */}
                          {isLearningItem(item) && (
                            <div className="mt-1 space-y-0.5">
                              {item.lesson && (
                                <p className="text-xs text-accent">{t("linked.lesson", { title: localized.text(item.lesson, "title") })}</p>
                              )}
                              {item.module && (
                                <p className="text-xs text-accent">{t("linked.module", { title: localized.text(item.module, "title") })}</p>
                              )}
                              {getProgressDisplay(item)}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {itemTypeLabel(item.type)}
                            </Badge>
                            {item.assignment?.autoCompleted && (
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                {t("autoCompleted")}
                              </Badge>
                            )}
                            {item.estimatedHours > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {t("estimatedHours", { hours: item.estimatedHours })}
                              </span>
                            )}
                            {item.assignment?.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                {t("due", { date: new Date(item.assignment.dueDate).toLocaleDateString(intlLocale()) })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pl-11 sm:pl-0">
                        <StatusChip status={item.assignment?.status || 'not_started'} />

                        {/* Learning items: Show curriculum navigation */}
                        {isLearningItem(item) ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(getCurriculumLink(item), '_blank')}
                              data-testid={`button-curriculum-${item.id}`}
                            >
                              <BookOpen className="w-3 h-3 mr-1" />
                              {item.lesson ? t('actions.viewLesson') : t('actions.viewModule')}
                            </Button>
                          </div>
                        ) : (
                          /* Non-learning items: Show manual controls */
                          item.assignment && (
                            <div className="flex gap-1">
                              {!isAssignmentDone(item.assignment.status) && (
                                <>
                                  {item.assignment.status !== 'in_progress' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(item.assignment!.id, 'in_progress')}
                                      disabled={updateStatusMutation.isPending}
                                      data-testid={`button-start-${item.id}`}
                                    >
                                      <Play className="w-3 h-3 mr-1" />
                                      {t("actions.start")}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(item.assignment!.id, 'completed')}
                                    disabled={updateStatusMutation.isPending}
                                    data-testid={`button-complete-${item.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {t("actions.complete")}
                                  </Button>
                                </>
                              )}
                            </div>
                          )
                        )}

                        {item.assignment && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={t("actions.moreFor", { title: localized.text(item, "title") })}
                                title={t("actions.more")}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-actions-${item.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={item.assignment.status === 'blocked'}
                                onSelect={() => handleStatusUpdate(item.assignment!.id, 'blocked')}
                                data-testid={`menu-block-${item.id}`}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                {t("actions.block")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={item.assignment.status === 'waived'}
                                onSelect={() => handleStatusUpdate(item.assignment!.id, 'waived')}
                                data-testid={`menu-waive-${item.id}`}
                              >
                                <SkipForward className="w-4 h-4 mr-2" />
                                {t("actions.waive")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={item.assignment.status === 'not_started'}
                                onSelect={() => handleStatusUpdate(item.assignment!.id, 'not_started')}
                                data-testid={`menu-reset-${item.id}`}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {t("actions.reset")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </WeekPanel>
            </li>
            );
          })}
        </ol>
      </div>
    </AppLayout>
  );
}
