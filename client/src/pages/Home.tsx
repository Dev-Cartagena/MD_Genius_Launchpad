import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCohortDate } from "@/lib/dates";
import type { Cohort } from "@shared/schema";
import { 
  ArrowRight, 
  Calendar, 
  Lightbulb, 
  Users, 
  FileText,
  TrendingUp,
  Award
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch user's applications for applicant redirect logic
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ["/api/applications/my"],
    enabled: !!user && user.role === 'applicant'
  });

  // Open cohorts (public, active only)
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  // Auto-redirect applicants with pending applications to dashboard
  useEffect(() => {
    if (user?.role === 'applicant' && applications.length > 0 && !applicationsLoading) {
      const currentApplication = applications[0];
      // Redirect to dashboard if they have a non-draft, non-rejected application
      if (currentApplication && currentApplication.status !== 'draft' && currentApplication.status !== 'rejected') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, applications, applicationsLoading, navigate]);

  // Helper to determine if applicant should see continue application action
  const shouldShowContinueApplication = () => {
    if (user?.role !== 'applicant') return false;
    if (applicationsLoading) return false; // Hide while loading to prevent flash
    if (applications.length === 0) return true; // New applicant
    
    const currentApplication = applications[0];
    // Only show for draft or rejected applications
    return currentApplication.status === 'draft' || currentApplication.status === 'rejected';
  };

  const quickActions = [
    {
      icon: FileText,
      title: "Apply to the program",
      description: "Apply to an upcoming cohort",
      href: "/apply",
      show: user?.role === "public_visitor"
    },
    {
      icon: FileText,
      title: "Continue application",
      description: "Complete your startup application",
      href: "/apply",
      show: shouldShowContinueApplication()
    },
    {
      icon: TrendingUp,
      title: "View dashboard",
      description: "Check your progress and updates",
      href: "/dashboard", 
      show: ["participant", "mentor", "investor", "administrator"].includes(user?.role || "")
    },
    {
      icon: Lightbulb,
      title: "My project",
      description: "Manage your startup project",
      href: "/project",
      show: user?.role === "participant"
    },
    {
      icon: Users,
      title: "Find mentors",
      description: "Book time with experienced mentors",
      href: "/mentors",
      show: user?.role === "participant"
    },
    {
      icon: Calendar,
      title: "Browse startups",
      description: "Discover investment opportunities",
      href: "/investors",
      show: user?.role === "investor"
    },
    {
      icon: Award,
      title: "Admin",
      description: "Manage cohorts, applications and settings",
      href: "/admin",
      show: user?.role === "administrator"
    },
  ].filter(action => action.show);

  const roleDescriptions = {
    public_visitor: "Explore the MD Genius Launchpad accelerator program.",
    applicant: "Your application is being reviewed. Check your dashboard for updates.",
    participant: "Welcome to the cohort. Your curriculum and project tools are ready.",
    mentor: "Thank you for mentoring our entrepreneurs. Check your mentee dashboard.",
    investor: "Review the AI startups in the current program.",
    administrator: "Manage cohorts, applications and platform settings."
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-[44px] font-medium leading-tight">
            Welcome back{user?.firstName && `, ${user.firstName}`}
          </h1>
          <p className="font-display text-lg text-muted-foreground max-w-2xl">
            {roleDescriptions[user?.role as keyof typeof roleDescriptions] || roleDescriptions.public_visitor}
          </p>
          <Badge
            variant="secondary"
            className="capitalize"
            data-testid="user-role-badge"
          >
            {user?.role?.replace('_', ' ') || 'Visitor'}
          </Badge>
        </div>

        {/* Quick Actions */}
        <section>
            <h2 className="text-2xl font-medium mb-4">Quick actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Card key={index} className="hover:border-accent transition-colors cursor-pointer" onClick={() => navigate(action.href)}>
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-secondary text-primary">
                      <action.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-medium mb-2" data-testid={`action-title-${index}`}>{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`action-description-${index}`}>
                      {action.description}
                    </p>
                    <Button variant="ghost" className="w-full justify-between p-0" data-testid={`button-action-${index}`}>
                      <span>Open</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
        </section>

        {/* Cohorts */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-medium mb-4">Cohorts</h3>
            {cohortsLoading ? (
              <p className="text-sm text-muted-foreground">Loading cohorts…</p>
            ) : cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-cohorts">
                No cohorts are open right now. Check back soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.map((cohort) => (
                  <Card key={cohort.id} className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4">
                      <h4 className="font-display font-medium text-sm mb-1" data-testid={`cohort-title-${cohort.id}`}>
                        {cohort.name}
                      </h4>
                      {cohort.description && (
                        <p className="text-sm text-muted-foreground mb-2">{cohort.description}</p>
                      )}
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span data-testid={`cohort-dates-${cohort.id}`}>
                          {formatCohortDate(cohort.startDate)} - {formatCohortDate(cohort.endDate)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
