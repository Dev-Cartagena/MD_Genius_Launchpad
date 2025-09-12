import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import AppLayout from "@/components/Layout/AppLayout";
import ParticipantDashboard from "@/components/Dashboard/ParticipantDashboard";
import MentorDashboard from "@/components/Dashboard/MentorDashboard";
import InvestorDashboard from "@/components/Dashboard/InvestorDashboard";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
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
        return <AdminDashboard />;
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
            Thank you for applying to MD Genius AI Launchpad 2025 Q1 cohort. 
            We've received your application and you'll receive a confirmation email shortly. 
            Our team will review your application and get back to you within 5-7 business days.
          </AlertDescription>
        </Alert>
      )}
      {getDashboardContent()}
    </AppLayout>
  );
}
