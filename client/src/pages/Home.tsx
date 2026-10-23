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
      title: "Apply to Accelerator",
      description: "Apply to an upcoming cohort",
      href: "/apply",
      color: "primary",
      show: user?.role === "public_visitor"
    },
    {
      icon: FileText,
      title: "Continue Application",
      description: "Complete your startup application",
      href: "/apply",
      color: "primary",
      show: shouldShowContinueApplication()
    },
    {
      icon: TrendingUp,
      title: "View Dashboard",
      description: "Check your progress and updates",
      href: "/dashboard", 
      color: "accent",
      show: ["participant", "mentor", "investor", "administrator"].includes(user?.role || "")
    },
    {
      icon: Lightbulb,
      title: "My Project",
      description: "Manage your startup project",
      href: "/project",
      color: "yellow",
      show: user?.role === "participant"
    },
    {
      icon: Users,
      title: "Find Mentors",
      description: "Connect with industry experts",
      href: "/mentors",
      color: "green",
      show: user?.role === "participant"
    },
    {
      icon: Calendar,
      title: "Browse Startups",
      description: "Discover investment opportunities",
      href: "/investors",
      color: "blue",
      show: user?.role === "investor"
    },
    {
      icon: Award,
      title: "Admin Panel",
      description: "Manage the platform",
      href: "/admin",
      color: "purple",
      show: user?.role === "administrator"
    },
  ].filter(action => action.show);

  const roleDescriptions = {
    public_visitor: "Welcome! Explore our AI startup accelerator program.",
    applicant: "Your application is being reviewed. Check your dashboard for updates.",
    participant: "Welcome to the cohort! Access your curriculum and project tools.",
    mentor: "Thank you for mentoring our entrepreneurs. Check your mentee dashboard.",
    investor: "Discover promising AI startups in our portfolio.",
    administrator: "Welcome back! Manage cohorts, applications, and platform settings."
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Welcome back{user?.firstName && `, ${user.firstName}`}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {roleDescriptions[user?.role as keyof typeof roleDescriptions] || roleDescriptions.public_visitor}
          </p>
          <Badge 
            className={`capitalize ${
              user?.role === 'administrator' ? 'bg-purple-500/20 text-purple-400' :
              user?.role === 'mentor' ? 'bg-green-500/20 text-green-400' :
              user?.role === 'investor' ? 'bg-blue-500/20 text-blue-400' :
              user?.role === 'participant' ? 'bg-accent/20 text-accent' :
              'bg-primary/20 text-primary'
            }`}
            data-testid="user-role-badge"
          >
            {user?.role?.replace('_', ' ') || 'Visitor'}
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <Card key={index} className="bg-secondary/30 hover:scale-105 transition-transform duration-200 cursor-pointer" onClick={() => navigate(action.href)}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      action.color === 'primary' ? 'bg-primary/20' :
                      action.color === 'accent' ? 'bg-accent/20' :
                      action.color === 'yellow' ? 'bg-yellow-400/20' :
                      action.color === 'green' ? 'bg-green-400/20' :
                      action.color === 'blue' ? 'bg-blue-400/20' :
                      'bg-purple-500/20'
                    }`}>
                      <action.icon className={`w-6 h-6 ${
                        action.color === 'primary' ? 'text-primary' :
                        action.color === 'accent' ? 'text-accent' :
                        action.color === 'yellow' ? 'text-yellow-400' :
                        action.color === 'green' ? 'text-green-400' :
                        action.color === 'blue' ? 'text-blue-400' :
                        'text-purple-500'
                      }`} />
                    </div>
                    <h3 className="font-bold mb-2" data-testid={`action-title-${index}`}>{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`action-description-${index}`}>
                      {action.description}
                    </p>
                    <Button variant="ghost" className="w-full justify-between p-0" data-testid={`button-action-${index}`}>
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cohorts */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Cohorts</h3>
            {cohortsLoading ? (
              <p className="text-sm text-muted-foreground">Loading cohorts...</p>
            ) : cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-cohorts">
                No cohorts are open right now. Check back soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.map((cohort) => (
                  <Card key={cohort.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-1" data-testid={`cohort-title-${cohort.id}`}>
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
