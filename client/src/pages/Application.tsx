import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localized";
import { intlLocale } from "@/i18n";
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
  draft: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
  submitted: { icon: Clock, color: "text-accent", bg: "bg-secondary" },
  under_review: { icon: Clock, color: "text-accent", bg: "bg-secondary" },
  shortlisted: { icon: Users, color: "text-success", bg: "bg-success/10" },
  interview: { icon: Calendar, color: "text-warning", bg: "bg-warning/10" },
  offer: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  waitlist: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  rejected: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  accepted: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
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
  const { t } = useTranslation(["application", "common"]);
  const localized = useLocalized();
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
            <h1 className="text-3xl md:text-4xl font-medium">{t("status.title")}</h1>
            <p className="font-display text-lg text-muted-foreground">
              {t("status.thanks")}
            </p>
            <NodeRule />
          </div>

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">{t("status.yourApplication")}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 md:p-8 md:pt-0">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-lg flex items-center justify-center ${status.bg}`}>
                    <StatusIcon className={`w-6 h-6 ${status.color}`} />
                  </div>
                <div>
                  <Badge className={`font-display text-sm px-3 py-1 border-0 ${status.bg} ${status.color}`} data-testid="application-status">
                    {t(`common:applicationStatus.${currentApplication.status as keyof typeof statusConfig}`)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2" data-testid="application-date">
                    {t("status.submittedOn", {
                      date: new Date(currentApplication.submittedAt ?? currentApplication.createdAt ?? Date.now()).toLocaleDateString(intlLocale()),
                    })}
                  </p>
                </div>
                </div>

                {/* Status-specific messages */}
                {currentApplication.status === 'submitted' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.submitted.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.messages.submitted.body")}
                    </p>
                  </div>
                )}

                {currentApplication.status === 'under_review' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.under_review.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.messages.under_review.body")}
                    </p>
                  </div>
                )}

                {currentApplication.status === 'shortlisted' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.shortlisted.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.messages.shortlisted.body")}
                    </p>
                  </div>
                )}

                {currentApplication.status === 'interview' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.interview.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.messages.interview.body")}
                    </p>
                  </div>
                )}

                {currentApplication.status === 'offer' && (
                  <MistPanel className="p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.offer.title")}</h3>
                    <p className="text-sm text-foreground/80">
                      {t("status.messages.offer.body")}
                    </p>
                  </MistPanel>
                )}

                {currentApplication.status === 'accepted' && (
                  <MistPanel className="p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.accepted.title")}</h3>
                    <p className="text-sm text-foreground/80 mb-4">
                      {t("status.messages.accepted.body")}
                    </p>
                    <Button
                      onClick={() => window.location.href = "/dashboard"}
                      data-testid="button-access-dashboard"
                    >
                      {t("status.messages.accepted.button")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </MistPanel>
                )}

                {currentApplication.status === 'waitlist' && (
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <h3 className="text-base font-medium mb-2">{t("status.messages.waitlist.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("status.messages.waitlist.body")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">{t("status.timeline.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const appStatus = currentApplication.status ?? '';
                const steps = [
                  {
                    id: "submitted",
                    title: t("status.timeline.submitted"),
                    caption: new Date(currentApplication.submittedAt ?? currentApplication.createdAt ?? Date.now()).toLocaleDateString(intlLocale()),
                  },
                  ...(appStatus !== 'submitted'
                    ? [{ id: "review", title: t("status.timeline.underReview"), caption: t("status.timeline.reviewCompleted") }]
                    : []),
                  ...(['shortlisted', 'interview', 'offer', 'accepted'].includes(appStatus)
                    ? [{ id: "shortlisted", title: t("status.timeline.shortlisted"), caption: t("status.timeline.selectedForInterview") }]
                    : []),
                  ...(['offer', 'accepted'].includes(appStatus)
                    ? [{ id: "offer", title: t("status.timeline.offer"), caption: t("status.timeline.congratulations") }]
                    : []),
                ];
                return (
                  <ol>
                    {steps.map((step, index) => (
                      <TimelineStep key={step.id} title={step.title} caption={step.caption} isLast={index === steps.length - 1} />
                    ))}
                  </ol>
                );
              })()}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-medium mb-2">{t("status.questions.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("status.questions.body")}
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
          <h1 className="text-3xl md:text-4xl font-medium">{t("apply.title")}</h1>
          <p className="font-display text-lg text-muted-foreground max-w-2xl">
            {t("apply.lead")}
          </p>
          <NodeRule />

          {currentApplication?.status === 'draft' && (
            <div className="rounded-xl border border-border bg-secondary p-4 max-w-md">
              <p className="text-sm font-medium">{t("apply.draft.title")}</p>
              <p className="text-xs text-muted-foreground">
                {t("apply.draft.started", {
                  date: new Date(currentApplication.createdAt ?? Date.now()).toLocaleDateString(intlLocale()),
                })}
              </p>
            </div>
          )}
        </div>

        {/* Program Overview */}
        {!currentApplication && (
          <Card>
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-medium mb-6">{t("apply.overview.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">{t("apply.overview.program.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("apply.overview.program.body")}
                  </p>
                </div>
                
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">{t("apply.overview.mentorship.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("apply.overview.mentorship.body")}
                  </p>
                </div>
                
                <div>
                  <div className="w-10 h-10 bg-secondary text-primary rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-medium mb-2">{t("apply.overview.investors.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("apply.overview.investors.body")}
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
              <CardTitle className="text-xl font-medium">{t("apply.cohorts.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cohorts.slice(0, 2).map((cohort: Cohort) => (
                  <Card key={cohort.id} className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4">
                      <h3 className="text-base font-medium mb-2" data-testid={`cohort-name-${cohort.id}`}>{localized.text(cohort, "name")}</h3>
                      <p className="text-sm text-muted-foreground mb-2" data-testid={`cohort-description-${cohort.id}`}>
                        {localized.text(cohort, "description")}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span data-testid={`cohort-start-date-${cohort.id}`}>
                          {t("apply.cohorts.starts", { date: formatCohortDate(cohort.startDate) })}
                        </span>
                        <Badge variant="outline" data-testid={`cohort-capacity-${cohort.id}`}>
                          {t("apply.cohorts.places", { count: cohort.capacity })}
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
              <h2 className="text-2xl font-medium">{t("apply.signIn.title")}</h2>
              <p className="text-muted-foreground max-w-xl">
                {t("apply.signIn.body")}
              </p>
              <Button asChild data-testid="button-sign-in-to-apply">
                <Link href="/login?next=/apply">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t("apply.signIn.button")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
