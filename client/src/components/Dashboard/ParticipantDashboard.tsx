import { useQuery } from "@tanstack/react-query";
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
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Project, Cohort, Milestone } from "@shared/schema";

export default function ParticipantDashboard() {
  const { user } = useAuth();

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

  // Fetch milestones for user's cohort
  const userCohort = cohorts.find((c: Cohort) => {
    // Find cohort based on project's cohort ID or default to first active cohort
    return currentProject.cohortId ? c.id === currentProject.cohortId : c.isActive;
  });
  
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: [`/api/cohorts/${userCohort?.id}/milestones`],
    enabled: !!userCohort?.id,
  });

  // Transform milestones for display (progress calculation to be implemented with deliverables)
  const milestonesWithProgress = milestones.map((milestone: Milestone, index: number) => ({
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    dueDate: milestone.dueDate,
    // TODO: Replace with real progress from deliverables API
    status: index === 0 ? "approved" : index === 1 ? "in_progress" : "not_started",
    completion: index === 0 ? 100 : index === 1 ? 75 : 0,
    orderIndex: milestone.orderIndex,
  }));

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

  if (projectsLoading || milestonesLoading) {
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
                <span className="text-accent font-medium" data-testid="progress-percentage">65%</span>
              </div>
              <Progress value={65} className="h-3" data-testid="progress-bar" />
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
        {/* Next Actions */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Next Actions</CardTitle>
              <Badge variant="destructive" className="text-xs" data-testid="overdue-count">
                2 overdue
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextActions.map((action) => (
                <Card key={action.id} className={`${
                  action.isOverdue 
                    ? 'border-destructive/20 bg-destructive/5' 
                    : 'border-border'
                }`} data-testid={`action-${action.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1" data-testid={`action-title-${action.id}`}>
                          {action.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Clock className={`w-3 h-3 ${action.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <span className={`text-xs ${action.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {action.isOverdue ? `Overdue by ${action.dueDate}` : `Due in ${action.dueDate}`}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className={action.priority === 'high' ? 'bg-primary' : 'border border-border'}
                        variant={action.priority === 'high' ? 'default' : 'outline'}
                        data-testid={`button-action-${action.id}`}
                      >
                        {action.priority === 'high' ? 'Start' : 'View'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
