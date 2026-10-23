import { useState } from "react";
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
  assignmentStatusClass,
  assignmentStatusLabel,
  countAssignmentStatuses,
  isAssignmentDone,
} from "@/lib/roadmapStatus";
import {
  MoreVertical,
  Ban,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  Clock,
  Play,
  BookOpen,
  Target,
  FileText,
  Users,
  Calendar,
  TrendingUp
} from "lucide-react";

interface RoadmapItemWithAssignment {
  id: string;
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
    content?: string;
  };
  module?: {
    id: string;
    title: string;
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
  };
  items: RoadmapItemWithAssignment[];
}

export default function Roadmap() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const handleStatusUpdate = (assignmentId: string, status: string) => {
    updateStatusMutation.mutate({ assignmentId, status });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'blocked':
        return <Ban className="w-4 h-4 text-red-600" />;
      case 'waived':
        return <SkipForward className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = assignmentStatusClass;

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
          {item.progressData.isCompleted ? '✓ Completed' : 'Not started'}
          {item.progressData.score && ` • Score: ${item.progressData.score}%`}
        </div>
      );
    } else if (item.progressData.type === 'module') {
      const { completedLessons = 0, totalLessons = 0, completionRate = 0 } = item.progressData;
      return (
        <div className="text-xs text-muted-foreground">
          Progress: {completedLessons}/{totalLessons} lessons ({Math.round(completionRate)}%)
        </div>
      );
    }
    return null;
  };

  if (!user || user.role !== 'participant') {
    return (
      <AppLayout title="Roadmap">
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Roadmap access is only available for participants.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (projectsLoading) {
    return (
      <AppLayout title="Program Roadmap" subtitle="Track your startup journey">
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
      <AppLayout title="Program Roadmap" subtitle="Track your startup journey">
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">You don't have a project yet. Create a project to access your roadmap.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Program Roadmap" subtitle="Track your startup journey">
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
      <AppLayout title="Program Roadmap" subtitle="Track your startup journey">
        <div className="md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Roadmap Assigned</h3>
              <p className="text-muted-foreground">
                Your program roadmap hasn't been assigned yet. Check back later or contact your program coordinator.
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

  return (
    <AppLayout title="Program Roadmap" subtitle="Track your startup journey">
      <div className="md:p-6 space-y-6">
        {/* Progress Overview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {roadmap.template.name}
            </CardTitle>
            <p className="text-muted-foreground">{roadmap.template.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{doneItems}/{totalItems} done</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
                  <div className="text-sm text-green-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{counts.waived}</div>
                  <div className="text-sm text-purple-600">Waived</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{counts.inProgress}</div>
                  <div className="text-sm text-blue-600">In progress</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{counts.blocked}</div>
                  <div className="text-sm text-red-600">Blocked</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{counts.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
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
            All Weeks
          </Button>
          {weeks.map((week) => (
            <Button
              key={week}
              variant={selectedWeek === week ? "default" : "outline"}
              onClick={() => setSelectedWeek(week)}
              className="whitespace-nowrap"
              data-testid={`button-week-${week}`}
            >
              Week {week}
            </Button>
          ))}
        </div>

        {/* Roadmap Items */}
        <div className="space-y-4">
          {weeks
            .filter(week => selectedWeek === null || week === selectedWeek)
            .map((week) => (
            <Card key={week} className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Week {week}
                  <Badge variant="outline" className="ml-auto">
                    {(itemsByWeek[week] || []).filter(item => isAssignmentDone(item.assignment?.status)).length}/
                    {(itemsByWeek[week] || []).length} done
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(itemsByWeek[week] || [])
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getItemTypeIcon(item.type)}
                        {getStatusIcon(item.assignment?.status || 'not_started')}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        
                        {/* Learning item specific info */}
                        {isLearningItem(item) && (
                          <div className="mt-1">
                            {item.lesson && (
                              <p className="text-xs text-blue-600">📚 Lesson: {item.lesson.title}</p>
                            )}
                            {item.module && (
                              <p className="text-xs text-blue-600">📖 Module: {item.module.title}</p>
                            )}
                            {getProgressDisplay(item)}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.type.replace(/_/g, ' ')}
                          </Badge>
                          {item.assignment?.autoCompleted && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                              Auto-completed
                            </Badge>
                          )}
                          {item.estimatedHours > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ~{item.estimatedHours}h
                            </span>
                          )}
                          {item.assignment?.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due: {new Date(item.assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getStatusColor(item.assignment?.status || 'not_started')}>
                          {assignmentStatusLabel(item.assignment?.status)}
                        </Badge>
                        
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
                              {item.lesson ? 'View Lesson' : 'View Module'}
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
                                      Start
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(item.assignment!.id, 'completed')}
                                    disabled={updateStatusMutation.isPending}
                                    data-testid={`button-complete-${item.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Complete
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
                                aria-label={`More actions for ${item.title}`}
                                title="More actions"
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
                                Mark blocked
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={item.assignment.status === 'waived'}
                                onSelect={() => handleStatusUpdate(item.assignment!.id, 'waived')}
                                data-testid={`menu-waive-${item.id}`}
                              >
                                <SkipForward className="w-4 h-4 mr-2" />
                                Waive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={item.assignment.status === 'not_started'}
                                onSelect={() => handleStatusUpdate(item.assignment!.id, 'not_started')}
                                data-testid={`menu-reset-${item.id}`}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset to not started
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}