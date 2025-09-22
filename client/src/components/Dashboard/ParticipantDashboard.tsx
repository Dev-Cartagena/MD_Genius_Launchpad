import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { Project, Cohort, Milestone } from "@shared/schema";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  itemType: string;
  weekNumber: number;
  orderIndex: number;
  estimatedHours: number;
  assignment?: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate?: string;
  };
}

interface ProjectRoadmap {
  template: {
    id: string;
    title: string;
    description: string;
  };
  items: RoadmapItem[];
}

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects/my"],
  });

  // Fetch active cohorts
  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  // Get current project (first project or default)
  const currentProject = projects[0] || {
    id: "",
    name: "No Project Yet",
    stage: "ideation",
    summary: "You haven't created a project yet. Start by defining your AI startup idea.",
    readinessScore: 0,
  };

  // Fetch roadmap for the current project
  const { data: roadmap, isLoading: roadmapLoading } = useQuery<ProjectRoadmap>({
    queryKey: [`/api/projects/${currentProject.id}/roadmap`],
    enabled: !!currentProject.id && currentProject.id !== ""
  });

  // Mutation to update roadmap assignment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      return apiRequest("PATCH", `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentProject.id}/roadmap`] });
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
  const userCohort = cohorts.find((c: Cohort) => {
    // Find cohort based on project's cohort ID or default to first active cohort
    return currentProject.cohortId ? c.id === currentProject.cohortId : c.isActive;
  });
  
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
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
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
    item => item.weekNumber === currentWeek
  ).sort((a, b) => a.orderIndex - b.orderIndex) || [];

  const nextActions = [
    {
      id: 1,
      title: "Complete Customer Interview #3",
      description: "Market Validation Milestone",
      isOverdue: true,
      dueDate: "2 days ago",
      priority: "high"
    },
    {
      id: 2,
      title: "Update Lean Canvas",
      description: "Based on latest interview insights",
      isOverdue: false,
      dueDate: "3 days",
      priority: "medium"
    },
    {
      id: 3,
      title: "Mentor Session: Market Strategy",
      description: "1:1 with Sarah Chen",
      isOverdue: false,
      dueDate: "Tomorrow 2:00 PM",
      priority: "high"
    },
  ];

  const upcomingSchedule = [
    {
      id: 1,
      title: "Mentor Session",
      description: "Sarah Chen • Product Strategy",
      time: "Today 2:00 PM",
      type: "mentor"
    },
    {
      id: 2,
      title: "Cohort Workshop", 
      description: "Market Validation Deep Dive",
      time: "Wed 10:00 AM",
      type: "workshop"
    },
    {
      id: 3,
      title: "Deliverable Due",
      description: "Customer Interview Report", 
      time: "Fri 11:59 PM",
      type: "deadline"
    }
  ];

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
              <span className="text-sm text-muted-foreground">Week {currentWeek} of {totalWeeks}</span>
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
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Technical Depth</span>
                <span className="text-accent">85%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Market Fit</span>
                <span className="text-primary">70%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team Readiness</span>
                <span className="text-yellow-400">55%</span>
              </div>
            </div>
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
                          {getItemTypeIcon(item.itemType)}
                          {getStatusIcon(item.assignment?.status || 'pending')}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1" data-testid={`roadmap-title-${item.id}`}>
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-xs">
                              {item.itemType}
                            </Badge>
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
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.assignment?.status || 'pending')}>
                            {item.assignment?.status || 'pending'}
                          </Badge>
                          
                          {item.assignment && (
                            <div className="flex gap-1">
                              {item.assignment.status !== 'completed' && (
                                <>
                                  {item.assignment.status !== 'in_progress' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(item.assignment!.id, 'in_progress')}
                                      disabled={updateStatusMutation.isPending}
                                      data-testid={`button-start-${item.id}`}
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(item.assignment!.id, 'completed')}
                                    disabled={updateStatusMutation.isPending}
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
            {/* Recent AI Suggestions */}
            <div className="space-y-3 mb-4">
              <Card className="bg-secondary/50 border-l-4 border-accent">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-1">💡 Market Research Tip</p>
                  <p className="text-xs text-muted-foreground">
                    "Based on your interviews, consider exploring the enterprise segment. I've found 3 relevant case studies in your industry."
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-secondary/50 border-l-4 border-primary">
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-1">🎯 Technical Recommendation</p>
                  <p className="text-xs text-muted-foreground">
                    "Your AI model accuracy could improve with data augmentation. I can guide you through implementation strategies."
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                data-testid="button-pitch-practice"
              >
                Pitch Practice
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                data-testid="button-tech-help"
              >
                Tech Help
              </Button>
            </div>
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
                {currentProject.stage} Stage
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4" data-testid="project-summary">
              {currentProject.summary}
            </p>

            {/* Project Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent" data-testid="metric-interviews">12</p>
                <p className="text-xs text-muted-foreground">Customer Interviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary" data-testid="metric-features">3</p>
                <p className="text-xs text-muted-foreground">MVP Features</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400" data-testid="metric-market-size">$50K</p>
                <p className="text-xs text-muted-foreground">Market Size (TAM)</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium mb-3">Recent Updates</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-muted-foreground text-xs">2 hours ago</span>
                  <span>Updated lean canvas with new value proposition</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-muted-foreground text-xs">1 day ago</span>
                  <span>Completed interview with Enterprise customer #8</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-muted-foreground text-xs">3 days ago</span>
                  <span>Submitted Problem Definition milestone</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSchedule.map((event) => (
                <div key={event.id} className={`border-l-4 pl-3 ${
                  event.type === 'mentor' ? 'border-accent' :
                  event.type === 'workshop' ? 'border-primary' :
                  'border-yellow-400'
                }`} data-testid={`schedule-${event.id}`}>
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
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4 border-border hover:bg-secondary/80"
              data-testid="button-view-calendar"
            >
              View Full Calendar
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Community and Resources */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Community */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cohort Community</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder-avatar-1.jpg" alt="Maria Santos" />
                  <AvatarFallback>MS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-sm">Maria Santos</p>
                    <span className="text-xs text-muted-foreground">HealthTech AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Just completed our first customer pilot! 🚀 The feedback has been incredible.
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto text-accent hover:underline">
                      👏 12 reactions
                    </Button>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder-avatar-2.jpg" alt="David Kim" />
                  <AvatarFallback>DK</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-sm">David Kim</p>
                    <span className="text-xs text-muted-foreground">FinTech AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Looking for feedback on our pitch deck. Anyone available for a quick review session?
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto text-primary hover:underline">
                      💬 Reply
                    </Button>
                    <span className="text-xs text-muted-foreground">5 hours ago</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-4 border-border hover:bg-secondary/80"
              data-testid="button-view-discussions"
            >
              View All Discussions
            </Button>
          </CardContent>
        </Card>

        {/* Resource Library */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: FileText, title: "Lean Canvas Template", description: "Business model framework", color: "primary" },
                { icon: Video, title: "Customer Interview Guide", description: "Video workshop series", color: "accent" },
                { icon: Target, title: "AI Ethics Checklist", description: "Responsible AI guidelines", color: "green" },
                { icon: Users, title: "Pitch Deck Examples", description: "Successful startup decks", color: "yellow" },
              ].map((resource, index) => (
                <Card key={index} className="bg-secondary/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        resource.color === 'primary' ? 'bg-primary/20' :
                        resource.color === 'accent' ? 'bg-accent/20' :
                        resource.color === 'green' ? 'bg-green-400/20' :
                        'bg-yellow-400/20'
                      }`}>
                        <resource.icon className={`w-4 h-4 ${
                          resource.color === 'primary' ? 'text-primary' :
                          resource.color === 'accent' ? 'text-accent' :
                          resource.color === 'green' ? 'text-green-400' :
                          'text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{resource.title}</p>
                        <p className="text-xs text-muted-foreground">{resource.description}</p>
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs text-accent hover:underline"
                      data-testid={`button-resource-${index}`}
                    >
                      Open
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
