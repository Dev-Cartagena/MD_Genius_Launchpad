import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { cohortStatusMessage } from "@/lib/cohorts";
import ParticipantDashboard from "@/components/Dashboard/ParticipantDashboard";
import MentorDashboard from "@/components/Dashboard/MentorDashboard";
import InvestorDashboard from "@/components/Dashboard/InvestorDashboard";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { User, Application, Project, Cohort } from "@shared/schema";
import { getApplicationTitle, getApplicationDescription } from "@/lib/applicationUtils";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  // Fetch admin data when user is administrator
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/admin/applications"],
    enabled: user?.role === 'administrator'
  });

  // Admin endpoint includes inactive cohorts
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/admin/cohorts"],
    enabled: user?.role === 'administrator'
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'administrator'
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    enabled: user?.role === 'administrator'
  });

  // Calculate real admin metrics from API data
  const adminMetrics = useMemo(() => {
    if (user?.role !== 'administrator') return null;
    
    const totalApplications = applications.length;
    const acceptedApps = applications.filter((app: Application) => app.status === 'accepted').length;
    const acceptanceRate = totalApplications > 0 ? Math.round((acceptedApps / totalApplications) * 100) : 0;
    const activeCohorts = cohorts.filter((cohort: Cohort) => cohort.isActive).length;
    const totalProjects = projects.length;
    
    return {
      totalApplications,
      acceptanceRate,
      activeCohorts,
      totalProjects,
      mentorUtilization: 0, // Future metric
      averageReadiness: projects.reduce((sum: number, p: Project) => sum + (p.readinessScore || 0), 0) / Math.max(projects.length, 1),
      fundingDisbursed: 0, // Future metric
      completionRate: 0 // Future metric
    };
  }, [applications, cohorts, projects, user?.role]);

  // Process real applications data with user information
  const recentApplications = useMemo(() => {
    if (user?.role !== 'administrator') return [];
    
    return applications.map((app: Application) => {
      const appUser = users.find((u: User) => u.id === app.userId);
      const submittedDate = new Date(app.submittedAt || app.createdAt!);
      const daysDiff = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: app.id!,
        applicant: appUser ? `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User',
        project: getApplicationTitle(app.answers),
        status: app.status || 'draft',
        submittedDays: daysDiff,
        score: (app.scores as any)?.total || 0,
        email: appUser?.email,
        description: getApplicationDescription(app.answers),
        reviewerNotes: app.reviewerNotes || []
      };
    }).sort((a, b) => a.submittedDays - b.submittedDays).slice(0, 5); // Show only recent 5
  }, [applications, users, user?.role]);

  // Generate dynamic system alerts from real data
  const systemAlerts = useMemo(() => {
    if (user?.role !== 'administrator') return [];
    
    const alerts: any[] = [];
    
    // Check for pending reviews
    const pendingReviews = applications.filter((app: Application) => app.status === 'submitted').length;
    if (pendingReviews > 0) {
      alerts.push({
        id: "pending-reviews",
        type: "warning",
        title: "Applications Pending Review",
        message: `${pendingReviews} application${pendingReviews > 1 ? 's' : ''} awaiting review`,
        priority: pendingReviews > 5 ? "high" : "medium"
      });
    }
    
    // Check for active cohorts
    const cohortMessage = cohortStatusMessage(cohorts);
    if (cohortMessage) {
      alerts.push({
        id: "active-cohorts",
        type: "info",
        title: "Active Cohorts",
        message: cohortMessage,
        priority: "low"
      });
    }
    
    return alerts;
  }, [applications, cohorts, user?.role]);

  useEffect(() => {
    // wouter's location has no query string, so read it from window.location
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('submitted') === 'true') {
      setShowSubmissionSuccess(true);
      // Clear the URL parameter after showing the message
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, [location]);

  if (isLoading) {
    return (
      <AppLayout title="Dashboard" subtitle="Loading your dashboard...">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'participant':
        return <ParticipantDashboard />;
      case 'mentor':
        return <MentorDashboard />;
      case 'investor':
        return <InvestorDashboard />;
      case 'administrator':
        if (!adminMetrics || applicationsLoading || cohortsLoading || usersLoading || projectsLoading) {
          return (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }
        return (
          <AdminDashboard 
            metrics={adminMetrics}
            recentApplications={recentApplications}
            cohorts={cohorts}
            systemAlerts={systemAlerts}
          />
        );
      case 'applicant':
        return (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Application Under Review</h3>
              <p className="text-muted-foreground mb-4">
                Your application has been submitted and is currently under review by our admissions team.
              </p>
              <div className="text-left bg-secondary/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What happens next:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Our team will review your application within 5-7 business days</li>
                  <li>• You'll receive an email notification with the decision</li>
                  <li>• If accepted, you'll get access to the full participant dashboard</li>
                  <li>• Check your email regularly for updates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dashboard Not Available</h3>
              <p className="text-muted-foreground">
                Your current role ({user?.role || 'unknown'}) doesn't have a dashboard available.
                Please contact support if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'participant':
        return "Participant Dashboard";
      case 'mentor':
        return "Mentor Dashboard";
      case 'investor':
        return "Investor Dashboard";
      case 'administrator':
        return "Admin Dashboard";
      case 'applicant':
        return "Application Status";
      default:
        return "Dashboard";
    }
  };

  const getDashboardSubtitle = () => {
    const name = user?.firstName ? `, ${user.firstName}` : '';
    switch (user?.role) {
      case 'participant':
        return `Welcome back${name}! Let's build something amazing.`;
      case 'mentor':
        return `Welcome back${name}! Guide the next generation of AI entrepreneurs.`;
      case 'investor':
        return `Welcome back${name}! Discover promising AI startups.`;
      case 'administrator':
        return `Welcome back${name}! Manage the launchpad platform.`;
      case 'applicant':
        return `Thank you${name} for applying to MD Genius AI Launchpad`;
      default:
        return `Welcome back${name}!`;
    }
  };

  return (
    <AppLayout 
      title={getDashboardTitle()} 
      subtitle={getDashboardSubtitle()}
    >
      {showSubmissionSuccess && (
        <Alert className="mb-6 border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Application Successfully Submitted!</AlertTitle>
          <AlertDescription className="text-green-700">
            Thank you for applying to MD Genius AI Launchpad. We've received your application.
            Our team will review it and get back to you within 5-7 business days. You can follow its status here.
          </AlertDescription>
        </Alert>
      )}
      {getDashboardContent()}
    </AppLayout>
  );
}
