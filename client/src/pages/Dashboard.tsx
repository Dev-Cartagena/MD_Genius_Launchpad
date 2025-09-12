import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/Layout/AppLayout";
import ParticipantDashboard from "@/components/Dashboard/ParticipantDashboard";
import MentorDashboard from "@/components/Dashboard/MentorDashboard";
import InvestorDashboard from "@/components/Dashboard/InvestorDashboard";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();

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
      default:
        return `Welcome back${name}!`;
    }
  };

  return (
    <AppLayout 
      title={getDashboardTitle()} 
      subtitle={getDashboardSubtitle()}
    >
      {getDashboardContent()}
    </AppLayout>
  );
}
