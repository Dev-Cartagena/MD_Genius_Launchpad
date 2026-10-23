type CohortDates = {
  isActive?: boolean | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};

/** A cohort is running when it is active and today falls within its start and end dates. */
export function isCohortRunning(cohort: CohortDates, now: Date = new Date()): boolean {
  if (!cohort.isActive || !cohort.startDate || !cohort.endDate) return false;
  const start = new Date(cohort.startDate).getTime();
  const end = new Date(cohort.endDate).getTime();
  const t = now.getTime();
  return start <= t && t <= end;
}

/** Active cohorts whose start date is still in the future. */
export function isCohortUpcoming(cohort: CohortDates, now: Date = new Date()): boolean {
  if (!cohort.isActive || !cohort.startDate) return false;
  return new Date(cohort.startDate).getTime() > now.getTime();
}

/** Summary message for the admin "Active Cohorts" alert, or null when there is nothing to say. */
export function cohortStatusMessage(cohorts: CohortDates[], now: Date = new Date()): string | null {
  const running = cohorts.filter((c) => isCohortRunning(c, now)).length;
  const upcoming = cohorts.filter((c) => isCohortUpcoming(c, now)).length;
  const active = cohorts.filter((c) => c.isActive).length;
  const ended = active - running - upcoming;
  const plural = (n: number) => `${n} cohort${n === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (running > 0) parts.push(`${plural(running)} currently running`);
  if (upcoming > 0) parts.push(`${plural(upcoming)} starting soon`);
  if (ended > 0) parts.push(`${plural(ended)} active but past the end date`);
  return parts.length ? parts.join(", ") : null;
}
