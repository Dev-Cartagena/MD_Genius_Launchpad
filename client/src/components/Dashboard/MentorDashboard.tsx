import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar,
  Clock,
  Users,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  Star,
  Video,
  FileText,
  Target
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function MentorDashboard() {
  const { user } = useAuth();

  // Fetch mentor-specific data
  const { data: mentees = [] } = useQuery({
    queryKey: ["/api/mentors/mentees"],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/mentors/sessions"],
  });

  // Mock mentor metrics
  const mentorStats = {
    activeMentees: 8,
    totalSessions: 24,
    avgRating: 4.8,
    hoursThisMonth: 16,
    completedProjects: 5,
    upcomingSessions: 3
  };

  const upcomingSessions = [
    {
      id: 1,
      mentee: "Alex Rodriguez",
      project: "EcoAI Analytics",
      time: "Today 2:00 PM",
      duration: "60 min",
      type: "Strategy Session",
      status: "confirmed"
    },
    {
      id: 2,
      mentee: "Sarah Kim",
      project: "HealthTech AI",
      time: "Tomorrow 10:00 AM", 
      duration: "45 min",
      type: "Technical Review",
      status: "pending"
    },
    {
      id: 3,
      mentee: "Michael Chen",
      project: "AgriTech Optimizer",
      time: "Wed 3:00 PM",
      duration: "30 min",
      type: "Pitch Practice",
      status: "confirmed"
    }
  ];

  const recentFeedback = [
    {
      id: 1,
      mentee: "Alex Rodriguez",
      project: "EcoAI Analytics",
      milestone: "Market Validation",
      status: "needs_revision",
      lastUpdated: "2 hours ago"
    },
    {
      id: 2,
      mentee: "Emily Zhang",
      project: "FinTech Analytics",
      milestone: "MVP Development",
      status: "approved",
      lastUpdated: "1 day ago"
    },
    {
      id: 3,
      mentee: "David Wilson",
      project: "EduAI Platform",
      milestone: "Problem Definition",
      status: "submitted",
      lastUpdated: "3 days ago"
    }
  ];

  const menteeProgress = [
    { name: "Alex Rodriguez", project: "EcoAI Analytics", progress: 75, stage: "Validation", readiness: 70 },
    { name: "Sarah Kim", project: "HealthTech AI", progress: 60, stage: "MVP Build", readiness: 65 },
    { name: "Michael Chen", project: "AgriTech Optimizer", progress: 85, stage: "Pitch Ready", readiness: 82 },
    { name: "Emily Zhang", project: "FinTech Analytics", progress: 45, stage: "Ideation", readiness: 48 },
  ];

  return (
    <div className="space-y-6">
      {/* Mentor Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Mentees</p>
                <p className="text-2xl font-bold" data-testid="metric-mentees">{mentorStats.activeMentees}</p>
                <p className="text-xs text-primary mt-1">Across 2 cohorts</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Hours</p>
                <p className="text-2xl font-bold" data-testid="metric-hours">{mentorStats.hoursThisMonth}</p>
                <p className="text-xs text-accent mt-1">↑ 20% from last month</p>
              </div>
              <Clock className="w-8 h-8 text-accent opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session Rating</p>
                <p className="text-2xl font-bold" data-testid="metric-rating">{mentorStats.avgRating}</p>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-3 h-3 ${star <= mentorStats.avgRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Projects</p>
                <p className="text-2xl font-bold" data-testid="metric-completed">{mentorStats.completedProjects}</p>
                <p className="text-xs text-green-400 mt-1">All successful exits</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Upcoming Sessions and Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Upcoming Sessions</span>
              </CardTitle>
              <Button size="sm" data-testid="button-manage-schedule">Manage Schedule</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-sm" data-testid={`session-mentee-${session.id}`}>
                            {session.mentee}
                          </p>
                          <Badge 
                            variant={session.status === 'confirmed' ? 'default' : 'outline'}
                            data-testid={`session-status-${session.id}`}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {session.project} • {session.type}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`session-time-${session.id}`}>{session.time}</span>
                          </span>
                          <span>{session.duration}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button 
                          size="sm" 
                          className="bg-primary"
                          data-testid={`button-join-${session.id}`}
                        >
                          <Video className="w-3 h-3 mr-1" />
                          Join
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-reschedule-${session.id}`}
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Feedback & Reviews */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Recent Feedback</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFeedback.map((feedback) => (
                <Card key={feedback.id} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm" data-testid={`feedback-mentee-${feedback.id}`}>
                          {feedback.mentee}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {feedback.project} • {feedback.milestone}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              feedback.status === 'approved' ? 'default' :
                              feedback.status === 'needs_revision' ? 'destructive' :
                              'outline'
                            }
                            data-testid={`feedback-status-${feedback.id}`}
                          >
                            {feedback.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {feedback.lastUpdated}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        data-testid={`button-review-${feedback.id}`}
                      >
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Mentee Progress Tracking */}
      <section>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Mentee Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menteeProgress.map((mentee, index) => (
                <Card key={index} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`/placeholder-avatar-${index + 1}.jpg`} alt={mentee.name} />
                        <AvatarFallback>{mentee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm" data-testid={`mentee-name-${index}`}>
                            {mentee.name}
                          </p>
                          <Badge variant="outline" data-testid={`mentee-stage-${index}`}>
                            {mentee.stage}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {mentee.project}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Program Progress</span>
                            <span className="font-medium" data-testid={`mentee-progress-${index}`}>
                              {mentee.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${mentee.progress}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between text-xs mt-2">
                            <span>Readiness Score</span>
                            <span className="font-medium" data-testid={`mentee-readiness-${index}`}>
                              {mentee.readiness}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Mentor Resources and Tools */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor Resources */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Mentor Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: FileText, title: "Mentoring Best Practices", description: "Guidelines and frameworks", color: "primary" },
                { icon: Target, title: "Evaluation Rubrics", description: "Milestone assessment tools", color: "accent" },
                { icon: MessageCircle, title: "Feedback Templates", description: "Structured feedback forms", color: "green" },
                { icon: TrendingUp, title: "Progress Tracking", description: "Mentee development metrics", color: "yellow" },
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
                      data-testid={`button-mentor-resource-${index}`}
                    >
                      Access
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-schedule-session"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-review-deliverables"
              >
                <FileText className="w-4 h-4 mr-2" />
                Review Deliverables
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-update-availability"
              >
                <Clock className="w-4 h-4 mr-2" />
                Update Availability
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-mentee-progress"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Track Progress
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-send-message"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
