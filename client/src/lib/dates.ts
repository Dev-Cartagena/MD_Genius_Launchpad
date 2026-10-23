import { intlLocale } from "@/i18n";

/**
 * Cohort start/end dates are stored as UTC midnight. Format them in UTC so they
 * don't shift a day for users west of UTC.
 */
export function formatCohortDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(), { ...options, timeZone: "UTC" });
}
