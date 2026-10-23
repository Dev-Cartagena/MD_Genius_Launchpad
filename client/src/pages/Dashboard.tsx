import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { useTranslation } from "react-i18next";
import { isCohortRunning, isCohortUpcoming } from "@/lib/cohorts";
import ParticipantDashboard from "@/components/Dashboard/ParticipantDashboard";
import MentorDashboard from "@/components/Dashboard/MentorDashboard";
import InvestorDashboard from "@/components/Dashboard/InvestorDashboard";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { User, Application, Project, Cohort } from "@shared/schema";
import { getApplicationTitle, getApplicationDescription } from "@/lib/applicationUtils";

const DASHBOARD_ROLES = ["participant", "mentor", "investor", "administrator", "applicant"] as const;
type DashboardRole = (typeof DASHBOARD_ROLES)[number];

function dashboardRole(role: string | null | undefined): DashboardRole | "default" {
  return (DASHBOARD_ROLES as readonly string[]).includes(role ?? "") ? (role as DashboardRole) : "default";
}

const KNOWN_ROLES = ["public_visitor", "applicant", "participant", "mentor", "investor", "administrator"] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];

export default function Dashboard() {
  const { t } = useTranslation(["dashboard", "common"]);
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
        applicant: appUser ? `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim() || t("page.unknownUser") : t("page.unknownUser"),
        project: getApplicationTitle(app.answers),
        status: app.status || 'draft',
        submittedDays: daysDiff,
        score: (app.scores as any)?.total || 0,
        email: appUser?.email,
        description: getApplicationDescription(app.answers),
        reviewerNotes: app.reviewerNotes || []
      };
    }).sort((a, b) => a.submittedDays - b.submittedDays).slice(0, 5); // Show only recent 5
  }, [applications, users, user?.role, t]);

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
        title: t("page.alerts.pendingReviews.title"),
        message: t("page.alerts.pendingReviews.message", { count: pendingReviews }),
        priority: pendingReviews > 5 ? "high" : "medium"
      });
    }
    
    // Check for active cohorts
    const now = new Date();
    const running = cohorts.filter((c) => isCohortRunning(c, now)).length;
    const upcoming = cohorts.filter((c) => isCohortUpcoming(c, now)).length;
    const ended = cohorts.filter((c) => c.isActive).length - running - upcoming;
    const parts: string[] = [];
    if (running > 0) parts.push(t("page.alerts.cohorts.running", { count: running }));
    if (upcoming > 0) parts.push(t("page.alerts.cohorts.upcoming", { count: upcoming }));
    if (ended > 0) parts.push(t("page.alerts.cohorts.ended", { count: ended }));
    const cohortMessage = parts.length ? parts.join(", ") : null;
    if (cohortMessage) {
      alerts.push({
        id: "active-cohorts",
        type: "info",
        title: t("page.alerts.cohorts.title"),
        message: cohortMessage,
        priority: "low"
      });
    }
    
    return alerts;
  }, [applications, cohorts, user?.role, t]);

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
      <AppLayout title={t("common:nav.dashboard")} subtitle={t("page.loadingSubtitle")}>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
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
                <Card key={i} className="animate-pulse">
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
          <Card className="mx-auto max-w-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-medium mb-2">{t("page.applicant.title")}</h3>
              <p className="text-muted-foreground mb-6">
                {t("page.applicant.body")}
              </p>
              <div className="rounded-lg bg-secondary p-4">
                <h4 className="font-display text-sm font-medium mb-2">{t("page.applicant.nextTitle")}</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>{t("page.applicant.next1")}</li>
                  <li>{t("page.applicant.next2")}</li>
                  <li>{t("page.applicant.next3")}</li>
                  <li>{t("page.applicant.next4")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-xl font-medium mb-2">{t("page.unavailable.title")}</h3>
              <p className="text-muted-foreground">
                {t("page.unavailable.body", {
                  role: (KNOWN_ROLES as readonly string[]).includes(user?.role ?? "")
                    ? t(`common:roles.${user!.role as KnownRole}`)
                    : user?.role || t("page.unavailable.unknownRole"),
                })}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const getDashboardTitle = () => t(`page.title.${dashboardRole(user?.role)}`);

  const getDashboardSubtitle = () => {
    const role = dashboardRole(user?.role);
    return user?.firstName
      ? t(`page.subtitleName.${role}`, { name: user.firstName })
      : t(`page.subtitle.${role}`);
  };

  return (
    <AppLayout 
      title={getDashboardTitle()} 
      subtitle={getDashboardSubtitle()}
    >
      {showSubmissionSuccess && (
        <Alert className="mb-6 border-success/30 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="font-display text-foreground">{t("page.submitted.title")}</AlertTitle>
          <AlertDescription className="text-foreground/80">
            {t("page.submitted.body")}
          </AlertDescription>
        </Alert>
      )}
      {getDashboardContent()}
    </AppLayout>
  );
}
