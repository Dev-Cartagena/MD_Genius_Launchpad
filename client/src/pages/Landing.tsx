import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/lib/localized";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import type { Cohort } from "@shared/schema";
import { formatCohortDate } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo, NodeRule } from "@/components/brand";
import {
  BookOpen,
  Map,
  Users,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  Calendar,
  Check,
  ArrowRight,
} from "lucide-react";

export default function Landing() {
  const { t } = useTranslation("landing");
  const localized = useLocalized();
  // Public endpoint: active cohorts open to applicants
  const { data: openCohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });
  const nextCohort = [...openCohorts].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )[0];

  // Stats will be populated with real data when available
  const stats: any[] = [];

  const modules = [
    { key: "curriculum", icon: BookOpen },
    { key: "roadmap", icon: Map },
    { key: "mentors", icon: Users },
    { key: "investors", icon: TrendingUp },
    { key: "coach", icon: MessageSquare },
  ] as const;

  const features = [
    { key: "curriculum", icon: Lightbulb },
    { key: "mentorship", icon: Users },
    { key: "investors", icon: TrendingUp },
    { key: "demoDay", icon: Calendar },
  ] as const;

  // Alumni testimonials will be populated with real testimonials when available
  const testimonials: any[] = [];

  const cohortTimeline = [
    { key: "foundation", week: "1-2" },
    { key: "validation", week: "3-4" },
    { key: "development", week: "5-6" },
    { key: "launch", week: "7-8" },
  ] as const;

  const highlights = ["noFee", "rolling", "global"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" aria-label={t("nav.home")}>
            <Logo layout="compact" className="h-7" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/login")}>
              {t("nav.signIn")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            {nextCohort && (
              <Badge variant="secondary" className="mb-6" data-testid="hero-badge">
                {t("hero.badge", {
                  name: localized.text(nextCohort, "name"),
                  date: formatCohortDate(nextCohort.startDate),
                })}
              </Badge>
            )}
            <h1 className="font-display text-4xl md:text-[46px] font-medium leading-tight tracking-[-0.01em] mb-5">
              {t("hero.title")}
            </h1>
            <p className="font-display text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl">
              {t("hero.lead")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => (window.location.href = "/login")}
                data-testid="button-apply-now"
              >
                {t("hero.apply")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => (window.location.href = "/login")}
                data-testid="button-login"
              >
                {t("hero.signIn")}
              </Button>
            </div>
          </div>

          <div className="hero-surface rounded-3xl flex items-center justify-center p-10 min-h-[260px] md:min-h-[380px]">
            <Logo layout="vertical" tone="reversed" className="h-32 md:h-40" />
          </div>
        </div>

        {/* Stats section hidden until real data is available */}
        {stats.length > 0 && (
          <div className="max-w-6xl mx-auto mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="font-display text-3xl font-medium mb-1" data-testid={`stat-value-${index}`}>{stat.value}</div>
                  <div className="font-display text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Program modules */}
      <section className="px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl md:text-[28px] mb-3">{t("modules.title")}</h2>
            <NodeRule />
          </div>
          <div className="flex flex-col md:flex-row md:items-stretch">
            {modules.map((module, index) => (
              <Fragment key={module.key}>
                {index > 0 && (
                  <div aria-hidden="true" className="flex justify-center md:items-center">
                    <div className="h-6 w-0 border-l border-dashed border-steel/50 md:h-0 md:w-6 md:border-l-0 md:border-t" />
                  </div>
                )}
                <div className="panel flex-1 p-5">
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-medium mb-1">{t(`modules.${module.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`modules.${module.key}.description`)}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* What the program includes */}
      <section className="px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl md:text-[28px] mb-3">{t("features.title")}</h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {t("features.lead")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-6 md:p-8">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl mb-3" data-testid={`feature-title-${index}`}>{t(`features.${feature.key}.title`)}</h3>
                  <p className="text-muted-foreground leading-relaxed" data-testid={`feature-description-${index}`}>
                    {t(`features.${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Program timeline */}
      <section className="px-4 sm:px-6 py-12 md:py-16 border-y border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl md:text-[28px] mb-3">{t("timeline.title")}</h2>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {t("timeline.lead")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cohortTimeline.map((phase, index) => (
              <div key={index} className="panel p-6">
                <div className="font-display text-sm font-medium text-accent mb-2" data-testid={`phase-week-${index}`}>
                  {t("timeline.weeks", { weeks: phase.week })}
                </div>
                <h3 className="text-lg mb-2" data-testid={`phase-title-${index}`}>{t(`timeline.${phase.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`phase-description-${index}`}>
                  {t(`timeline.${phase.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials, shown once real testimonials exist */}
      {testimonials.length > 0 && (
        <section className="px-4 sm:px-6 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-[28px] mb-8">{t("testimonials.title")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6 leading-relaxed" data-testid={`testimonial-content-${index}`}>
                      "{testimonial.content}"
                    </p>
                    <div className="font-display font-medium" data-testid={`testimonial-name-${index}`}>{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground" data-testid={`testimonial-role-${index}`}>
                      {testimonial.role}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to action */}
      <section className="px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto panel p-6 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-[28px] mb-3">{t("cta.title")}</h2>
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              {t("cta.lead")}
            </p>
            <ul className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-muted-foreground">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  <span>{t(`cta.${item}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button
            size="lg"
            className="shrink-0"
            onClick={() => (window.location.href = "/login")}
            data-testid="button-start-application"
          >
            {t("cta.start")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo layout="symbol" className="h-6" />
            <span>{t("footer.brand")}</span>
          </div>
          <nav className="flex gap-6">
            <Link href="/terms" className="hover:text-accent hover:underline">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-accent hover:underline">
              {t("footer.privacy")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
