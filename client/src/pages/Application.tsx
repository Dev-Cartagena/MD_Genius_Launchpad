import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ApplicationForm from "@/components/Application/ApplicationForm";
import type { Application as ApplicationRecord, Cohort } from "@shared/schema";
import { formatCohortDate } from "@/lib/dates";
import { ConnectorBadge, MistPanel, NodeRule } from "@/components/brand";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText,
  Calendar,
  Users,
  ArrowRight,
  LogIn
} from "lucide-react";

const statusConfig = {
  draft: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted", label: "Draft" },
  submitted: { icon: Clock, color: "text-accent", bg: "bg-secondary", label: "Submitted" },
  under_review: { icon: Clock, color: "text-accent", bg: "bg-secondary", label: "Under review" },
  shortlisted: { icon: Users, color: "text-success", bg: "bg-success/10", label: "Shortlisted" },
  interview: { icon: Calendar, color: "text-warning", bg: "bg-warning/10", label: "Interview" },
  offer: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Offer" },
  waitlist: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Waitlist" },
  rejected: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
  accepted: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Accepted" },
};

/** One row of the application timeline: a connector badge joined to the next row by a hairline. */
function TimelineStep({ title, caption, isLast }: { title: string; caption: string; isLast?: boolean }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <ConnectorBadge state="done" />
        {!isLast && <div aria-hidden="true" className="w-px flex-1 min-h-4 bg-primary/30 my-1" />}
      </div>
      <div className={isLast ? "pt-1.5" : "pt-1.5 pb-5"}>
        <p className="font-display font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </li>
  );
}

export default function Application() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch user's applications (only when signed in; the endpoint requires a session)
  const { data: applications = [], isLoading } = useQuery<ApplicationRecord[]>({
    queryKey: ["/api/applications/my"],
    enabled: !!user,
  });

  // Fetch available cohorts for new applications
  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  const currentApplication = applications[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="animate-pulse">
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

  // Show existing application status if user has one (except rejected applications can reapply)
  if (currentApplication && currentApplication.status !== 'draft' && currentApplication.status !== 'rejected') {
    const status = statusConfig[currentApplication.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-medium">Application status</h1>
            <p className="font-display text-lg text-muted-foreground">
              Thank you for applying to MD Genius Launchpad.
            </p>
            <NodeRule />
          </div>

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Your application</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 md:p-8 md:pt-0">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-lg flex items-center justify-center ${status.bg}`}>
                    <StatusIcon className={`w-6 h-6 ${status.color}`} />
                  </div>
                <div>
                  <Badge className={`font-display text-sm px-3 py-1 border-0 ${status.bg} ${status.color}`} data-testid="application-status">
                    {status.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="application-date">
                    Submitted on {new Date(currentApplication.submittedAt ?? currentApplication.createdAt ?? Date.now()).toLocaleDateString()}
                  </p>
                </div>
                </div>

                {/* Status-specific messages */}
                {currentApplication.status === 'submitted' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">What happens next</h3>
                    <p className="text-sm text-muted-foreground">
                      Our admissions team is reviewing your application.
                      You will receive an email update within 5–7 business days.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'under_review' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">Under review</h3>
                    <p className="text-sm text-muted-foreground">
                      Our team is evaluating your application.
                      We will contact you soon with next steps.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'shortlisted' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">You have been shortlisted</h3>
                    <p className="text-sm text-muted-foreground">
                      Congratulations. Our team will contact you soon to schedule an interview.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'interview' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">Interview scheduled</h3>
                    <p className="text-sm text-muted-foreground">
                      Check your email for interview details and preparation materials.
                    </p>
                  </div>
                )}

                {currentApplication.status === 'offer' && (
                  <MistPanel className="p-5">
                    <h3 className="text-base font-medium mb-2">You have an offer</h3>
                    <p className="text-sm text-muted-foreground">
                      Congratulations. You have been offered a place in MD Genius Launchpad.
                      Our team will contact you by email to confirm your place.
                    </p>
                  </MistPanel>
                )}

                {currentApplication.status === 'accepted' && (
                  <MistPanel className="p-5">
                    <h3 className="text-base font-medium mb-2">Welcome to the cohort</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You are now part of MD Genius Launchpad. Open your participant dashboard to get started.
                    </p>
                    <Button
                      onClick={() => window.location.href = "/dashboard"}
                      data-testid="button-access-dashboard"
                    >
                      Open dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </MistPanel>
                )}

                {currentApplication.status === 'waitlist' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">On the waitlist</h3>
                    <p className="text-sm text-muted-foreground">
                      You are on the waitlist for the current cohort. We will let you know if a place opens up,
                      and we will automatically consider you for the next cohort.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Application timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const appStatus = currentApplication.status ?? '';
                const steps = [
                  {
                    title: "Application submitted",
                    caption: new Date(currentApplication.submittedAt ?? currentApplication.createdAt ?? Date.now()).toLocaleDateString(),
                  },
                  ...(appStatus !== 'submitted' ? [{ title: "Under review", caption: "Review completed" }] : []),
                  ...(['shortlisted', 'interview', 'offer', 'accepted'].includes(appStatus)
                    ? [{ title: "Shortlisted", caption: "Selected for interview" }]
                    : []),
                  ...(['offer', 'accepted'].includes(appStatus) ? [{ title: "Offer extended", caption: "Congratulations" }] : []),
                ];
                return (
                  <ol>
                    {steps.map((step, index) => (
                      <TimelineStep key={step.title} title={step.title} caption={step.caption} isLast={index === steps.length - 1} />
                    ))}
                  </ol>
                );
              })()}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-medium mb-2">Questions</h3>
              <p className="text-sm text-muted-foreground">
                If you have any questions about your application status, reply to any email from our admissions team.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show application form for new applications or draft status
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-medium">Apply to MD Genius Launchpad</h1>
          <p className="font-display text-lg text-muted-foreground max-w-2xl">
            An 8-week AI startup accelerator from MDGeniusAI, with mentorship and practical support
            to turn your idea into a business.
          </p>
          <NodeRule />

          {currentApplication?.status === 'draft' && (
            <div className="rounded-xl border border-border bg-secondary p-4 max-w-md">
              <p className="text-sm font-medium">Continue your draft application</p>
              <p className="text-xs text-muted-foreground">
                Started {new Date(currentApplication.createdAt ?? Date.now()).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Program Overview */}
        {!currentApplication && (
          <Card>
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-medium mb-6">Program overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">8-week program</h3>
                  <p className="text-sm text-muted-foreground">
                    A curriculum covering AI fundamentals, business strategy and the essentials of starting a company.
                  </p>
                </div>
                
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">Mentorship</h3>
                  <p className="text-sm text-muted-foreground">
                    One-to-one guidance from industry practitioners and experienced AI founders.
                  </p>
                </div>
                
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">Investor access</h3>
                  <p className="text-sm text-muted-foreground">
                    Introductions to venture capital and angel investors at Demo Day.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Cohorts */}
        {cohorts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Available cohorts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.slice(0, 2).map((cohort: Cohort) => (
                  <Card key={cohort.id} className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4">
                      <h3 className="text-base font-medium mb-2" data-testid={`cohort-name-${cohort.id}`}>{cohort.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`cohort-description-${cohort.id}`}>
                        {cohort.description}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span data-testid={`cohort-start-date-${cohort.id}`}>
                          Starts {formatCohortDate(cohort.startDate)}
                        </span>
                        <Badge variant="outline" data-testid={`cohort-capacity-${cohort.id}`}>
                          {cohort.capacity} places
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Application Form (requires an account so answers can be saved) */}
        {user ? (
          <ApplicationForm onComplete={() => navigate('/dashboard?submitted=true')} />
        ) : (
          <Card>
            <CardContent className="p-6 md:p-8 space-y-4">
              <h2 className="text-2xl font-medium">Create an account to apply</h2>
              <p className="text-muted-foreground max-w-xl">
                Applications are saved to your account, so you can come back to a draft and follow its
                status after you submit. Sign in, or create a free account, then return here to fill in the form.
              </p>
              <Button asChild data-testid="button-sign-in-to-apply">
                <Link href="/login?next=/apply">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in or create an account to apply
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
