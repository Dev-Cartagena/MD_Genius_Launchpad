import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ApplicationForm from "@/components/Application/ApplicationForm";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText,
  Calendar,
  Users,
  ArrowRight
} from "lucide-react";

const statusConfig = {
  draft: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted/20", label: "Draft" },
  submitted: { icon: Clock, color: "text-primary", bg: "bg-primary/20", label: "Submitted" },
  under_review: { icon: Clock, color: "text-accent", bg: "bg-accent/20", label: "Under Review" },
  shortlisted: { icon: Users, color: "text-green-400", bg: "bg-green-400/20", label: "Shortlisted" },
  interview: { icon: Calendar, color: "text-yellow-400", bg: "bg-yellow-400/20", label: "Interview" },
  offer: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/20", label: "Offer" },
  waitlist: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/20", label: "Waitlist" },
  rejected: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/20", label: "Rejected" },
  accepted: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/20", label: "Accepted" },
};

export default function Application() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch user's applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/applications/my"],
  });

  // Fetch available cohorts for new applications
  const { data: cohorts = [] } = useQuery({
    queryKey: ["/api/cohorts"],
  });

  const currentApplication = applications[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="glass-card animate-pulse">
            <CardContent className="p-8">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show existing application status if user has one
  if (currentApplication && currentApplication.status !== 'draft') {
    const status = statusConfig[currentApplication.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gradient">Application Status</h1>
            <p className="text-xl text-muted-foreground">
              Thank you for applying to MD Genius AI Launchpad
            </p>
          </div>

          {/* Application Status */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Your Application</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${status.bg}`}>
                  <StatusIcon className={`w-10 h-10 ${status.color}`} />
                </div>
                
                <div>
                  <Badge className={`text-lg px-6 py-2 ${status.bg} ${status.color}`} data-testid="application-status">
                    {status.label}
                  </Badge>
                  <p className="text-muted-foreground mt-4" data-testid="application-date">
                    Submitted on {new Date(currentApplication.submittedAt || currentApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Status-specific messages */}
                {currentApplication.status === 'submitted' && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">What's Next?</h3>
                    <p className="text-sm text-muted-foreground">
                      Your application is being reviewed by our admissions team. 
                      You'll receive an email update within 5-7 business days.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'under_review' && (
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">Under Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Your application is currently being evaluated by our team. 
                      We'll contact you soon with next steps.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'shortlisted' && (
                  <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">Congratulations!</h3>
                    <p className="text-sm text-muted-foreground">
                      You've been shortlisted! Our team will contact you soon to schedule an interview.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'interview' && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">Interview Scheduled</h3>
                    <p className="text-sm text-muted-foreground">
                      Check your email for interview details and preparation materials.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'offer' && (
                  <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-green-400">Offer Extended!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Congratulations! You've been accepted to MD Genius AI Launchpad.
                    </p>
                    <Button className="bg-gradient-to-r from-primary to-accent" data-testid="button-accept-offer">
                      Accept Offer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {currentApplication.status === 'accepted' && (
                  <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-green-400">Welcome to the Cohort!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You're officially part of MD Genius AI Launchpad. Access your participant dashboard to get started.
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-primary to-accent"
                      onClick={() => window.location.href = "/dashboard"}
                      data-testid="button-access-dashboard"
                    >
                      Access Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {currentApplication.status === 'waitlist' && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">On the Waitlist</h3>
                    <p className="text-sm text-muted-foreground">
                      You're on our waitlist for the current cohort. We'll notify you if a spot opens up 
                      or automatically consider you for the next cohort.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'rejected' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                    <h3 className="font-semibold mb-2">Not Selected</h3>
                    <p className="text-sm text-muted-foreground">
                      While we were impressed by your application, we're unable to offer you a spot in this cohort. 
                      You're welcome to apply for future cohorts.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application Timeline */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Application Submitted</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(currentApplication.submittedAt || currentApplication.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {currentApplication.status !== 'submitted' && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Under Review</p>
                      <p className="text-xs text-muted-foreground">Review completed</p>
                    </div>
                  </div>
                )}

                {['shortlisted', 'interview', 'offer', 'accepted'].includes(currentApplication.status) && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Shortlisted</p>
                      <p className="text-xs text-muted-foreground">Selected for interview</p>
                    </div>
                  </div>
                )}

                {['offer', 'accepted'].includes(currentApplication.status) && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Offer Extended</p>
                      <p className="text-xs text-muted-foreground">Congratulations!</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Questions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about your application status, feel free to contact us.
              </p>
              <Button variant="outline" data-testid="button-contact-support">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show application form for new applications or draft status
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gradient">Apply to MD Genius AI Launchpad</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join the premier AI startup accelerator. Transform your innovation into a thriving business 
            with expert mentorship and comprehensive support.
          </p>
          
          {currentApplication?.status === 'draft' && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm font-medium">Continue Your Draft Application</p>
              <p className="text-xs text-muted-foreground">
                Started {new Date(currentApplication.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Program Overview */}
        {!currentApplication && (
          <Card className="glass-card">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Program Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">8-Week Program</h3>
                  <p className="text-sm text-muted-foreground">
                    Intensive curriculum covering AI fundamentals, business strategy, and startup essentials
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">Expert Mentorship</h3>
                  <p className="text-sm text-muted-foreground">
                    1:1 guidance from industry leaders and successful AI entrepreneurs
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Investor Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Direct connections to VCs and angel investors at our Demo Day events
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Cohorts */}
        {cohorts.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Available Cohorts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.slice(0, 2).map((cohort: any) => (
                  <Card key={cohort.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2" data-testid={`cohort-name-${cohort.id}`}>{cohort.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`cohort-description-${cohort.id}`}>
                        {cohort.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span data-testid={`cohort-start-date-${cohort.id}`}>
                          Starts: {new Date(cohort.startDate).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" data-testid={`cohort-capacity-${cohort.id}`}>
                          {cohort.capacity} spots
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Application Form */}
        <ApplicationForm onComplete={() => navigate('/dashboard?submitted=true')} />
      </div>
    </div>
  );
}
