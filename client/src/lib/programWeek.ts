const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The accelerator runs for eight weeks. */
export const PROGRAM_WEEKS = 8;

export interface CohortTiming {
  state: "upcoming" | "running" | "finished";
  /** 1..PROGRAM_WEEKS while running; 0 before the start; PROGRAM_WEEKS after the end. */
  week: number;
  /** Whole days until the start date (upcoming cohorts only). */
  daysUntilStart: number;
}

/** Program week for a cohort, using the same formula as the server (week 1 starts on the start date). */
export function cohortTiming(
  cohort: { startDate?: string | Date | null; endDate?: string | Date | null } | null | undefined,
  now: Date = new Date(),
): CohortTiming | null {
  if (!cohort?.startDate) return null;
  const start = new Date(cohort.startDate).getTime();
  if (Number.isNaN(start)) return null;
  const end = cohort.endDate ? new Date(cohort.endDate).getTime() : start + PROGRAM_WEEKS * WEEK_MS;
  const t = now.getTime();
  if (t < start) return { state: "upcoming", week: 0, daysUntilStart: Math.ceil((start - t) / DAY_MS) };
  if (t > end + DAY_MS) return { state: "finished", week: PROGRAM_WEEKS, daysUntilStart: 0 };
  const week = Math.min(Math.max(Math.floor((t - start) / WEEK_MS) + 1, 1), PROGRAM_WEEKS);
  return { state: "running", week, daysUntilStart: 0 };
}
