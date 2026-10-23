import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localized";
import { Link, useLocation } from "wouter";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowDisc, Node, ProgramTrack } from "@/components/brand";
import { formatCohortDate } from "@/lib/dates";
import { cohortTiming, PROGRAM_WEEKS } from "@/lib/programWeek";
import { cn } from "@/lib/utils";
import type { Cohort } from "@shared/schema";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Lightbulb,
  Map,
  Search,
  Settings,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

type Role = "public_visitor" | "applicant" | "participant" | "mentor" | "investor" | "administrator";

interface Action {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

interface Fact {
  value: string | number;
  label: string;
}

const APPLICATION_STEPS = ["start", "submit", "review", "decision"] as const;

function applicationStep(status?: string | null): number {
  switch (status) {
    case undefined:
    case null:
    case "draft":
      return 1;
    case "submitted":
      return 2;
    case "under_review":
    case "shortlisted":
    case "interview":
    case "waitlist":
      return 3;
    default:
      return 4;
  }
}

const ACTION_KEYS = {
  reviewApplications: 1, manageCohorts: 1, programSetup: 1, weekRoadmap: 1, curriculum: 1, project: 1,
  bookMentor: 1, sessions: 1, mentorProfile: 1, mentorDirectory: 1, browseStartups: 1, meetings: 1,
  apply: 1, continueApplication: 1,
} as const;

function partOfDay(now = new Date()): "morning" | "afternoon" | "evening" {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function isUpcoming(session: { startTime?: string | Date | null }) {
  return session.startTime ? new Date(session.startTime).getTime() > Date.now() : false;
}

export default function Home() {
  const { user } = useAuth();
  const { t } = useTranslation(["home", "common"]);
  const localized = useLocalized();
  const [, navigate] = useLocation();
  const role = (user?.role ?? "public_visitor") as Role;
  const is = (...roles: Role[]) => roles.includes(role);

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ["/api/applications/my"],
    enabled: !!user && is("applicant", "public_visitor", "participant"),
  });

  // Open cohorts (public, active only)
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });

  const { data: adminApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/applications"],
    enabled: role === "administrator",
  });
  const { data: adminCohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/admin/cohorts"],
    enabled: role === "administrator",
  });
  const { data: adminUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: role === "administrator",
  });

  const { data: myProject } = useQuery<any>({
    queryKey: ["/api/projects/my"],
    enabled: role === "participant",
  });
  const { data: weekItems = [] } = useQuery<any[]>({
    queryKey: ["/api/roadmap/current-week"],
    enabled: role === "participant",
  });

  const { data: mentees = [] } = useQuery<any[]>({
    queryKey: ["/api/mentors/mentees"],
    enabled: role === "mentor",
  });
  const { data: mentorSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/mentor/sessions"],
    enabled: role === "mentor",
  });

  const { data: directory = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: role === "investor",
  });
  const { data: interests = [] } = useQuery<any[]>({
    queryKey: ["/api/investor/interests"],
    enabled: role === "investor",
  });
  const { data: investorSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/investor/sessions"],
    enabled: role === "investor",
  });

  // Participant cohort: the project's, else the accepted application's.
  const acceptedCohortId = applications.find((a) => a.status === "accepted")?.cohortId;
  const participantCohortId = myProject?.cohortId || acceptedCohortId;
  const { data: participantCohort } = useQuery<Cohort>({
    queryKey: [`/api/cohorts/${participantCohortId}`],
    enabled: role === "participant" && Boolean(participantCohortId),
  });

  // Auto-redirect applicants with pending applications to dashboard
  useEffect(() => {
    if (role === "applicant" && applications.length > 0 && !applicationsLoading) {
      const currentApplication = applications[0];
      if (currentApplication && currentApplication.status !== "draft" && currentApplication.status !== "rejected") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [role, applications, applicationsLoading, navigate]);

  // The cohort the hero tracks: the participant's own, else the running (or next) cohort.
  const cohortPool = role === "administrator" ? adminCohorts : cohorts;
  const byStart = [...cohortPool].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const runningCohort = byStart.find((c) => cohortTiming(c)?.state === "running");
  const nextCohort = byStart.find((c) => cohortTiming(c)?.state === "upcoming");
  const trackedCohort = role === "participant" ? participantCohort : runningCohort ?? nextCohort;
  const timing = cohortTiming(trackedCohort);

  const currentApplication = applications[0];
  const showsApplication = is("public_visitor", "applicant");
  const canContinueApplication =
    !applicationsLoading &&
    (applications.length === 0 || ["draft", "rejected"].includes(currentApplication?.status));

  const pendingReview = adminApplications.filter((a) =>
    ["submitted", "under_review", "shortlisted", "interview"].includes(a.status),
  ).length;

  const facts: Fact[] = (() => {
    switch (role) {
      case "administrator": {
        const participants = adminUsers.filter((u) => u.role === "participant").length;
        const mentors = adminUsers.filter((u) => u.role === "mentor").length;
        return [
          { value: pendingReview, label: t("facts.applicationsToReview", { count: pendingReview }) },
          { value: participants, label: t("facts.participants", { count: participants }) },
          { value: mentors, label: t("facts.mentors", { count: mentors }) },
        ];
      }
      case "participant": {
        const done = weekItems.filter((i) => ["completed", "waived"].includes(i.assignment?.status ?? i.status)).length;
        return [
          { value: `${done}/${weekItems.length}`, label: t("facts.weekItemsDone") },
          { value: myProject?.readinessScore ?? 0, label: t("facts.readiness") },
        ];
      }
      case "mentor": {
        const upcoming = mentorSessions.filter(isUpcoming).length;
        return [
          { value: mentees.length, label: t("facts.mentees", { count: mentees.length }) },
          { value: upcoming, label: t("facts.upcomingSessions", { count: upcoming }) },
        ];
      }
      case "investor": {
        const meetings = investorSessions.filter(isUpcoming).length;
        return [
          { value: directory.length, label: t("facts.directory", { count: directory.length }) },
          { value: interests.length, label: t("facts.interests", { count: interests.length }) },
          { value: meetings, label: t("facts.upcomingMeetings", { count: meetings }) },
        ];
      }
      default:
        return [];
    }
  })();

  const action = (key: Parameters<typeof actionText>[0], icon: LucideIcon, href: string): Action => ({
    icon,
    href,
    ...actionText(key),
  });
  function actionText(key: keyof typeof ACTION_KEYS) {
    return { title: t(`actions.${key}.title`), description: t(`actions.${key}.description`) };
  }

  const actions: Action[] = (() => {
    switch (role) {
      case "administrator":
        return [
          action("reviewApplications", ClipboardList, "/admin"),
          action("manageCohorts", Calendar, "/admin"),
          action("programSetup", Settings, "/admin"),
        ];
      case "participant":
        return [
          action("weekRoadmap", Map, "/roadmap"),
          action("curriculum", BookOpen, "/curriculum"),
          action("project", Lightbulb, "/project"),
          action("bookMentor", Users, "/mentors"),
        ];
      case "mentor":
        return [
          action("sessions", Calendar, "/dashboard"),
          action("mentorProfile", UserCircle, "/mentor-profile"),
          action("mentorDirectory", Users, "/mentors"),
        ];
      case "investor":
        return [action("browseStartups", Search, "/investors"), action("meetings", Calendar, "/dashboard")];
      default:
        return canContinueApplication
          ? [action(applications.length === 0 ? "apply" : "continueApplication", FileText, "/apply")]
          : [];
    }
  })();

  const primary = actions[0];
  const longDate = (value: string | Date | null | undefined) => formatCohortDate(value, { month: "long", day: "numeric" });
  const trackLabel = showsApplication
    ? t("track.application")
    : trackedCohort
      ? localized.text(trackedCohort, "name")
      : t("track.program");

  const trackCaption = (() => {
    if (showsApplication) {
      const step = applicationStep(currentApplication?.status);
      return t("track.applicationStep", {
        step,
        total: APPLICATION_STEPS.length,
        name: t(`appSteps.${APPLICATION_STEPS[step - 1]}`),
      });
    }
    if (!trackedCohort || !timing) {
      return role === "administrator" ? t("track.noCohortAdmin") : t("track.noCohort");
    }
    if (timing.state === "upcoming") {
      return t("track.startsIn", { date: longDate(trackedCohort.startDate), count: timing.daysUntilStart });
    }
    if (timing.state === "finished") return t("track.finished", { date: longDate(trackedCohort.endDate) });
    return t("track.running", { week: timing.week, total: PROGRAM_WEEKS, date: longDate(trackedCohort.endDate) });
  })();

  const trackCurrent = showsApplication
    ? applicationStep(currentApplication?.status)
    : !timing
      ? 0
      : timing.state === "finished"
        ? PROGRAM_WEEKS + 1
        : timing.week;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-10 pb-8">
        {/* Hero: the guideline's deep gradient with its hairline grid and alignment node */}
        <section className="hero-surface relative isolate overflow-hidden rounded-3xl text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[58%] -z-10 hidden w-px bg-white/15 lg:block" />

          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[58%_42%] lg:gap-0 lg:p-0">
            <div className="lg:p-12 lg:pr-10">
              <span
                className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 font-display text-xs text-white/85 ring-1 ring-inset ring-white/15"
                data-testid="user-role-badge"
              >
                {t(`common:roles.${role}`)}
              </span>
              <h1 className="mt-5 max-w-[16ch] text-[34px] font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl lg:text-[56px]">
                {user?.firstName
                  ? t(`greeting.${partOfDay()}Name`, { name: user.firstName })
                  : t(`greeting.${partOfDay()}`)}
              </h1>
              <p className="mt-4 max-w-[46ch] font-display text-base text-white/80 sm:text-lg">{t(`lead.${role}`)}</p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {primary && (
                  <Button asChild variant="secondary" size="lg" className="group pr-4">
                    <Link href={primary.href} data-testid="button-hero-primary">
                      {primary.title}
                      <ArrowDisc />
                    </Link>
                  </Button>
                )}
                {role !== "public_visitor" && role !== "applicant" && (
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/dashboard">{t("openDashboard")}</Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:flex lg:flex-col lg:justify-end lg:p-12 lg:pl-10">
              <p className="font-display text-sm text-white/70">{trackLabel}</p>
              <ProgramTrack
                className="mt-4"
                total={showsApplication ? APPLICATION_STEPS.length : PROGRAM_WEEKS}
                current={trackCurrent}
                currentLabel={trackCaption}
                label={`${trackLabel}: ${trackCaption}`}
              />
            </div>
          </div>

          {facts.length > 0 && (
            <dl
              className={cn(
                "relative grid border-t border-white/15",
                facts.length === 3 ? "sm:grid-cols-3 lg:grid-cols-[29%_29%_42%]" : "sm:grid-cols-2 lg:grid-cols-[58%_42%]",
              )}
            >
              {/* Alignment node where the hairlines cross */}
              <Node className="absolute left-[58%] top-0 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white/80 lg:block" />
              {facts.map((fact, i) => (
                <div
                  key={fact.label}
                  className={cn(
                    "flex items-baseline gap-3 px-6 py-5 sm:block sm:px-10 sm:py-7 lg:px-12",
                    i > 0 && "border-t border-white/15 sm:border-l sm:border-t-0",
                  )}
                >
                  <dt className="sr-only">{fact.label}</dt>
                  <dd className="font-display text-3xl font-medium tabular-nums text-white sm:text-4xl">{fact.value}</dd>
                  <dd className="font-display text-sm text-white/70 sm:mt-1">{fact.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Next steps */}
        {actions.length > 0 && (
          <section aria-labelledby="home-actions">
            <h2 id="home-actions" className="text-2xl font-medium">
              {t("actions.heading")}
            </h2>
            <div
              className={cn(
                "mt-5 grid gap-4",
                actions.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : actions.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              {actions.map((action, index) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group relative flex flex-col rounded-2xl border border-primary/[0.08] bg-card p-6 shadow-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
                  data-testid={`button-action-${index}`}
                >
                  <ActionGlyph icon={action.icon} />
                  <h3 className="mt-5 text-lg font-medium" data-testid={`action-title-${index}`}>
                    {action.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground" data-testid={`action-description-${index}`}>
                    {action.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-medium text-accent">
                    {t("actions.open")}
                    <span
                      aria-hidden="true"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-accent/30 transition-colors duration-150 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <ArrowGlyph />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cohorts */}
        {(showsApplication || cohorts.length > 0) && (
          <section aria-labelledby="home-cohorts">
            <h2 id="home-cohorts" className="text-2xl font-medium">
              {t("cohorts.heading")}
            </h2>
            {cohortsLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("cohorts.loading")}</p>
            ) : cohorts.length === 0 ? (
              <div className="dashed-zone mt-5 bg-card/60 p-8 text-center" data-testid="text-no-cohorts">
                <p className="font-display text-base text-foreground">{t("cohorts.emptyTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("cohorts.emptyBody")}</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[...cohorts]
                  .sort((a, b) => {
                    const rank = (c: Cohort) => ({ running: 0, upcoming: 1, finished: 2 })[cohortTiming(c)?.state ?? "finished"];
                    return rank(a) - rank(b) || new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                  })
                  .map((cohort) => {
                  const ct = cohortTiming(cohort);
                  return (
                    <div key={cohort.id} className="panel p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-medium" data-testid={`cohort-title-${cohort.id}`}>
                          {localized.text(cohort, "name")}
                        </h3>
                        {ct && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-0.5 font-display text-xs",
                              ct.state === "running" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
                            )}
                          >
                            {t(`common:cohortState.${ct.state}`, { week: ct.week, total: PROGRAM_WEEKS })}
                          </span>
                        )}
                      </div>
                      {cohort.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{localized.text(cohort, "description")}</p>
                      )}
                      <p className="mt-4 flex items-center gap-2 font-display text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span data-testid={`cohort-dates-${cohort.id}`}>
                          {t("common:dateRange", {
                            start: formatCohortDate(cohort.startDate),
                            end: formatCohortDate(cohort.endDate),
                          })}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}

/** Icon set on the guideline's gradient connector: two offset rounded blocks, Mist → Navy. */
function ActionGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-12 w-12">
      <span className="absolute left-0 top-0 h-7 w-7 rounded-lg bg-mist/70" />
      <span className="btn-brand absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-[10px] text-white shadow-[0_4px_10px_-4px_hsl(var(--navy)/0.5)]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </span>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
