import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MistPanel, DropZone } from "@/components/brand";
import {
  Calendar,
  Clock,
  Users,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
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
        title: session.title || "Mentor session",
        agenda: session.agenda || "Mentoring session",
        time: formatSessionTime(session.startTime),
        duration: calculateDuration(session.startTime, session.endTime),
        participants: session.participantIds?.length || 0,
        status: "Upcoming" as const,
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
    completedSessions: mentorSessions.filter(s => new Date(s.endTime) < new Date()).length
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
      milestone: session.agenda || "Session notes",
      status: new Date(session.endTime) < new Date() ? "completed" : "upcoming",
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
    const nowMs = Date.now();
    const sessionEnd = (s: MentorSession) => new Date(s.endTime ?? s.startTime).getTime();
    // Last session: the most recent one that has already ended
    const lastSession = participantSessions.find(s => sessionEnd(s) < nowMs);
    // Next session: the nearest one that starts in the future
    const nextSession = participantSessions
      .filter(s => new Date(s.startTime).getTime() > nowMs)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    
    return {
      name: menteeNames.get(participantId) || `Participant ${participantId.slice(0, 8)}`,
      project: (lastSession ?? nextSession)?.title || "No recent sessions",
      sessionCount, // Show real session count instead of synthetic progress
      lastSessionDate: lastSession ? new Date(lastSession.startTime).toLocaleDateString() : "None yet",
      nextSessionDate: nextSession ? new Date(nextSession.startTime).toLocaleDateString() : "None scheduled",
      hasNotes: Boolean(lastSession?.notes?.trim())
    };
  });

  return (
    <div className="space-y-6">
      {/* Mentor Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active mentees" value={mentorStats.activeMentees} hint="Current mentees" icon={Users} testId="metric-mentees" />
        <KpiCard label="Total sessions" value={mentorStats.totalSessions} hint="All time" icon={Clock} testId="metric-total" />
        <KpiCard label="Upcoming sessions" value={mentorStats.upcomingSessions} hint="Next 7 days" icon={Calendar} testId="metric-upcoming" />
        <KpiCard label="Completed sessions" value={mentorStats.completedSessions} hint="Past sessions" icon={CheckCircle} testId="metric-completed" />
      </section>

      {/* Upcoming Sessions and Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions (next step) */}
        <MistPanel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm text-foreground/80">Next 7 days</p>
              <h2 className="font-display text-xl font-medium">Upcoming sessions</h2>
            </div>
            <Link href="/mentor-profile">
              <Button size="sm" data-testid="button-manage-schedule">
                Edit availability
              </Button>
            </Link>
          </div>

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
            <DropZone className="bg-card/60 py-8">
              <p className="text-sm">Sessions will appear here once participants book time with you.</p>
            </DropZone>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-display font-medium text-sm" data-testid={`session-title-${session.id}`}>
                            {session.title}
                          </p>
                          <Badge
                            variant="secondary"
                            data-testid={`session-status-${session.id}`}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {session.agenda} · {session.participants} participant{session.participants !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-4 font-display text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`session-time-${session.id}`}>{session.time}</span>
                          </span>
                          <span>{session.duration}</span>
                        </div>
                      </div>
                      {session.sessionData.meetingLink && (
                        <Button
                          size="sm"
                          asChild
                          data-testid={`button-join-${session.id}`}
                        >
                          <a href={session.sessionData.meetingLink} target="_blank" rel="noopener noreferrer">
                            <Video className="w-3 h-3 mr-1" />
                            Join
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </MistPanel>

        {/* Recent Feedback & Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span>Recent feedback</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFeedback.length === 0 && (
                <DropZone className="py-6">
                  <p className="text-sm">Notes you add to past sessions will appear here.</p>
                </DropZone>
              )}
              {recentFeedback.map((feedback) => (
                <div key={feedback.id} className="rounded-lg border border-border p-4">
                  <p className="font-display font-medium text-sm" data-testid={`feedback-mentee-${feedback.id}`}>
                    {feedback.mentee}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {feedback.project} · {feedback.milestone}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={feedback.status === 'completed' ? 'default' : 'outline'}
                      data-testid={`feedback-status-${feedback.id}`}
                    >
                      {feedback.status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Badge>
                    <span className="font-display text-xs text-muted-foreground">
                      {feedback.lastUpdated}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Mentee Progress Tracking */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Mentee progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menteeProgress.length === 0 && (
              <DropZone className="py-6">
                <p className="text-sm">Participants appear here after they book a session with you.</p>
              </DropZone>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menteeProgress.map((mentee, index) => (
                <div key={index} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-medium text-primary-foreground" aria-hidden="true">
                      {mentee.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <p className="font-display font-medium text-sm" data-testid={`mentee-name-${index}`}>
                          {mentee.name}
                        </p>
                        <Badge variant="outline" data-testid={`mentee-sessions-${index}`}>
                          {mentee.sessionCount} {mentee.sessionCount === 1 ? 'session' : 'sessions'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {mentee.project}
                      </p>

                      <dl className="space-y-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Last session</dt>
                          <dd className="font-display font-medium" data-testid={`mentee-last-session-${index}`}>
                            {mentee.lastSessionDate}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Next session</dt>
                          <dd className="font-display font-medium" data-testid={`mentee-next-session-${index}`}>
                            {mentee.nextSessionDate}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Has notes</dt>
                          <dd className={`font-display font-medium ${mentee.hasNotes ? 'text-foreground' : 'text-muted-foreground'}`} data-testid={`mentee-notes-${index}`}>
                            {mentee.hasNotes ? 'Yes' : 'No'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link href="/mentor-profile">
                <Button className="w-full justify-start" variant="outline" data-testid="button-update-availability">
                  <Clock className="w-4 h-4 mr-2" />
                  Update profile and availability
                </Button>
              </Link>
              <Link href="/mentors">
                <Button className="w-full justify-start" variant="outline" data-testid="button-mentor-directory">
                  <Users className="w-4 h-4 mr-2" />
                  Mentor directory
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, testId }: {
  label: string;
  value: number | string;
  hint?: string;
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
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
