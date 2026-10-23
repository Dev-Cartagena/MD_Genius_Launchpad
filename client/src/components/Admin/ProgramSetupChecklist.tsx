import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ConnectorBadge } from "@/components/brand";
import { cn } from "@/lib/utils";

interface ProgramSetupChecklistProps {
  cohortCount: number;
  mentorCount: number;
  /** Switch the admin panel to a tab; "cohort" also opens the create-cohort dialog. */
  onGo: (target: "cohort" | "curriculum" | "roadmap" | "mentors") => void;
}

/**
 * The order a program is set up in: cohort → curriculum → roadmap template → mentors.
 * Hidden once every step is done.
 */
export default function ProgramSetupChecklist({ cohortCount, mentorCount, onGo }: ProgramSetupChecklistProps) {
  const { t } = useTranslation("admin");
  const { data: modules = [] } = useQuery<any[]>({ queryKey: ["/api/admin/modules"], refetchOnMount: "always" });
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/roadmap/templates"],
    refetchOnMount: "always",
  });

  const steps = [
    {
      key: "cohort" as const,
      title: t("setup.steps.cohort.title"),
      description: t("setup.steps.cohort.description"),
      done: cohortCount > 0,
      action: t("setup.steps.cohort.action"),
    },
    {
      key: "curriculum" as const,
      title: t("setup.steps.curriculum.title"),
      description: t("setup.steps.curriculum.description"),
      done: modules.length > 0,
      action: t("setup.steps.curriculum.action"),
    },
    {
      key: "roadmap" as const,
      title: t("setup.steps.roadmap.title"),
      description: t("setup.steps.roadmap.description"),
      done: templates.length > 0,
      action: t("setup.steps.roadmap.action"),
    },
    {
      key: "mentors" as const,
      title: t("setup.steps.mentors.title"),
      description: t("setup.steps.mentors.description"),
      done: mentorCount > 0,
      action: t("setup.steps.mentors.action"),
    },
  ];

  const firstOpen = steps.findIndex((s) => !s.done);
  if (firstOpen === -1) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="mist-panel p-6" aria-labelledby="setup-title" data-testid="program-setup">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="setup-title" className="text-xl font-medium">
          {t("setup.title")}
        </h3>
        <p className="font-display text-sm text-foreground/80">
          {t("setup.progress", { done: doneCount, total: steps.length })}
        </p>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => {
          const state = step.done ? "done" : i === firstOpen ? "current" : "upcoming";
          return (
            <li
              key={step.key}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5",
                state === "current" ? "border-accent/40 shadow-card" : "border-primary/[0.08]",
              )}
            >
              <ConnectorBadge state={state}>{i + 1}</ConnectorBadge>
              <p className="mt-4 font-display text-base font-medium">{step.title}</p>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{step.description}</p>
              {!step.done && (
                <Button
                  size="sm"
                  variant={state === "current" ? "default" : "outline"}
                  className="mt-4 self-start"
                  onClick={() => onGo(step.key)}
                  data-testid={`button-setup-${step.key}`}
                >
                  {step.action}
                </Button>
              )}
              {step.done && <p className="mt-4 font-display text-sm text-success">{t("setup.done")}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
