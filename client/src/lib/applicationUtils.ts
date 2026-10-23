import i18n from "@/i18n";
/**
 * Helpers for reading application answers. ApplicationForm stores answers as:
 * { personalInfo: {...}, education, experience, skills, idea: { description, problem, market } | null,
 *   availability, commitment, links: {...} }
 * Older records may still carry projectName / projectDescription.
 */
type ApplicationAnswers = {
  projectName?: string;
  projectDescription?: string;
  idea?: { description?: string; problem?: string; market?: string } | null;
  commitment?: string;
} | null | undefined;

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function getApplicationTitle(answers: unknown): string {
  const a = answers as ApplicationAnswers;
  if (a?.projectName?.trim()) return a.projectName.trim();
  const idea = a?.idea?.description?.trim() || a?.idea?.problem?.trim();
  if (idea) {
    const firstSentence = idea.split(/(?<=[.!?])\s/)[0];
    return truncate(firstSentence, 60);
  }
  return i18n.t("application.untitled");
}

export function getApplicationDescription(answers: unknown): string | undefined {
  const a = answers as ApplicationAnswers;
  if (a?.projectDescription?.trim()) return a.projectDescription.trim();
  const parts = [a?.idea?.description, a?.idea?.problem && `Problem: ${a.idea.problem}`, a?.idea?.market && `Market: ${a.idea.market}`]
    .filter((p): p is string => !!p && !!p.trim());
  if (parts.length > 0) return parts.join("\n\n");
  return a?.commitment?.trim() || undefined;
}
