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
import { useToast } from "@/hooks/use-toast";
import type { MentorSession } from "@shared/schema";

type Mentee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  sessionCount: number;
  lastSessionAt: string | null;
};

export default function MentorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch mentor-specific data
  const { data: mentees = [] } = useQuery<Mentee[]>({
    queryKey: ["/api/mentors/mentees"],
  });
  const menteeNames = new Map(
    mentees.map(m => [m.id, [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || ""])
  );

  const { data: mentorSessions = [], isLoading: sessionsLoading } = useQuery<MentorSession[]>({
    queryKey: ["/api/mentor/sessions"],
  });

  // Process real session data
  const getUpcomingSessions = () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return mentorSessions
      .filter(session => {
        const startTime = new Date(session.startTime);
        return startTime >= now && startTime <= oneWeekFromNow;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5) // Show next 5 sessions
      .map(session => ({
        id: session.id,
        title: session.title || "Mentor Session",
        agenda: session.agenda || "Mentoring session",
        time: formatSessionTime(session.startTime),
        duration: calculateDuration(session.startTime, session.endTime),
        participants: session.participantIds?.length || 0,
        status: "confirmed" as const,
        sessionData: session
      }));
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
  
  const calculateDuration = (startTime: string | Date, endTime: string | Date | null) => {
    if (!endTime) return "60 min"; // Default duration
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "60 min"; // Fallback for invalid dates
    }
    
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return "60 min"; // Fallback for invalid duration
    return `${diffMins} min`;
  };
  
  // Calculate mentor metrics from real data only
  const mentorStats = {
    activeMentees: mentees.length || Array.from(new Set(mentorSessions.flatMap(s => s.participantIds || []))).length,
    totalSessions: mentorSessions.length,
    upcomingSessions: getUpcomingSessions().length,
    completedSessions: mentorSessions.filter(s => new Date(s.startTime) < new Date()).length
  };
  
  const upcomingSessions = getUpcomingSessions();

  // Derive recent feedback from actual session data with proper sorting and null safety
  const recentFeedback = mentorSessions
    .filter(session => session.notes && session.notes.trim().length > 10) // Sessions with substantial notes/feedback
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) // Sort by most recent first
    .slice(0, 5) // Get most recent 5 with feedback
    .map(session => ({
      id: session.id,
      mentee: (session.participantIds?.[0] && menteeNames.get(session.participantIds[0])) || session.participantIds?.[0] || "Participant",
      project: session.title || "Session",
      milestone: session.agenda || "Session Notes",
      status: new Date(session.startTime) > new Date() ? "scheduled" : "completed",
      lastUpdated: new Date(session.startTime).toLocaleDateString()
    }));

  // Only show mentee progress if we have real session data - no synthetic calculations
  const menteeProgress = Array.from(new Set(
    mentorSessions
      .flatMap(session => session.participantIds || [])
      .filter(Boolean)
  )).slice(0, 4).map((participantId, index) => {
    const participantSessions = mentorSessions
      .filter(s => s.participantIds?.includes(participantId))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Sort by recency
    
    const sessionCount = participantSessions.length;
    const lastSession = participantSessions[0]; // Most recent
    
    return {
      name: menteeNames.get(participantId) || `Participant ${participantId.slice(0, 8)}`,
      project: lastSession?.title || "No Recent Sessions",
      sessionCount, // Show real session count instead of synthetic progress
      lastSessionDate: lastSession ? new Date(lastSession.startTime).toLocaleDateString() : "No sessions",
      hasNotes: Boolean(lastSession?.notes?.trim())
    };
  });

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
                <p className="text-xs text-primary mt-1">Current mentees</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold" data-testid="metric-total">{mentorStats.totalSessions}</p>
                <p className="text-xs text-accent mt-1">All time</p>
              </div>
              <Clock className="w-8 h-8 text-accent opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Sessions</p>
                <p className="text-2xl font-bold" data-testid="metric-upcoming">{mentorStats.upcomingSessions}</p>
                <p className="text-xs text-primary mt-1">Next 7 days</p>
              </div>
              <Clock className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Sessions</p>
                <p className="text-2xl font-bold" data-testid="metric-completed">{mentorStats.completedSessions}</p>
                <p className="text-xs text-green-400 mt-1">Past sessions</p>
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
              <Button 
                size="sm" 
                onClick={() => {
                  toast({
                    title: "Schedule Management",
                    description: "Schedule management functionality will be available soon.",
                  });
                }}
                data-testid="button-manage-schedule"
              >
                Manage Schedule
              </Button>
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
            ) : upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-sm font-medium mb-2">No Upcoming Sessions</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Your schedule is clear for this week. Sessions will appear here once booked.
                </p>
                <Button size="sm" variant="outline" data-testid="button-create-session">
                  Create Session
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <Card key={session.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm" data-testid={`session-title-${session.id}`}>
                              {session.title}
                            </p>
                            <Badge 
                              variant={session.status === 'confirmed' ? 'default' : 'outline'}
                              data-testid={`session-status-${session.id}`}
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {session.agenda} • {session.participants} participant{session.participants !== 1 ? 's' : ''}
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
                            onClick={() => {
                              // TODO: Open reschedule modal or navigate to reschedule page
                              toast({
                                title: "Reschedule Session",
                                description: "Session rescheduling functionality will be available soon.",
                              });
                            }}
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
            )}
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
                        <AvatarFallback>{mentee.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm" data-testid={`mentee-name-${index}`}>
                            {mentee.name}
                          </p>
                          <Badge variant="outline" data-testid={`mentee-sessions-${index}`}>
                            {mentee.sessionCount} sessions
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {mentee.project}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Last Session</span>
                            <span className="font-medium" data-testid={`mentee-last-session-${index}`}>
                              {mentee.lastSessionDate}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs">
                            <span>Has Notes</span>
                            <span className={`font-medium ${mentee.hasNotes ? 'text-green-600' : 'text-gray-500'}`} data-testid={`mentee-notes-${index}`}>
                              {mentee.hasNotes ? 'Yes' : 'No'}
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
