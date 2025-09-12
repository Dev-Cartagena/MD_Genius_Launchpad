import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const quickActions = [
    {
      icon: FileText,
      title: "Apply to Accelerator",
      description: "Start your startup application for Q4 2024",
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
      show: user?.role === "applicant"
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

  const announcements = [
    {
      id: 1,
      title: "Q4 2024 Cohort Applications Open",
      description: "Applications are now being accepted for our upcoming cohort starting in October.",
      type: "info",
      date: "2024-09-12"
    },
    {
      id: 2,
      title: "New AI Ethics Workshop Available",
      description: "Learn about responsible AI development and ethical considerations in our latest workshop.",
      type: "update", 
      date: "2024-09-10"
    },
    {
      id: 3,
      title: "Demo Day Success Stories",
      description: "Congratulations to our Q2 cohort! 8 out of 12 startups secured funding after Demo Day.",
      type: "success",
      date: "2024-09-08"
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "AI Startup Fundamentals Webinar",
      date: "2024-09-20",
      time: "2:00 PM PST",
      type: "webinar"
    },
    {
      id: 2,
      title: "Q3 Demo Day",
      date: "2024-09-25",
      time: "10:00 AM PST", 
      type: "demo_day"
    },
    {
      id: 3,
      title: "Mentor Office Hours",
      date: "2024-09-22",
      time: "3:00 PM PST",
      type: "office_hours"
    }
  ];

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
                <Card key={index} className="bg-secondary/30 hover:scale-105 transition-transform duration-200 cursor-pointer" onClick={() => window.location.href = action.href}>
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

        {/* Announcements and Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Announcements */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Latest Announcements</h3>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm" data-testid={`announcement-title-${announcement.id}`}>
                          {announcement.title}
                        </h4>
                        <Badge 
                          variant={
                            announcement.type === 'success' ? 'default' :
                            announcement.type === 'info' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {announcement.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`announcement-description-${announcement.id}`}>
                        {announcement.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(announcement.date).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-announcements">
                View All Announcements
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm" data-testid={`event-title-${event.id}`}>
                          {event.title}
                        </h4>
                        <Badge 
                          className={
                            event.type === 'demo_day' ? 'bg-accent/20 text-accent' :
                            event.type === 'webinar' ? 'bg-primary/20 text-primary' :
                            'bg-green-400/20 text-green-400'
                          }
                        >
                          {event.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span data-testid={`event-date-${event.id}`}>
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </span>
                        <span data-testid={`event-time-${event.id}`}>{event.time}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-calendar">
                View Full Calendar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resource Links */}
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-bold mb-4">Need Help?</h3>
            <p className="text-muted-foreground mb-6">
              Access our comprehensive resources or get support from our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" data-testid="button-help-center">
                <FileText className="w-4 h-4 mr-2" />
                Help Center
              </Button>
              <Button variant="outline" data-testid="button-contact-support">
                <Users className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
