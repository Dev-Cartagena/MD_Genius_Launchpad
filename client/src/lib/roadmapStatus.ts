import i18n from "@/i18n";

export type AssignmentStatus = "not_started" | "in_progress" | "completed" | "blocked" | "waived";

const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["not_started", "in_progress", "completed", "blocked", "waived"];

/** Human label for an assignment status in the current language; never shows the raw value. */
export function assignmentStatusLabel(status?: string | null): string {
  const key = (status ?? "not_started") as AssignmentStatus;
  if (ASSIGNMENT_STATUSES.includes(key)) return i18n.t(`assignmentStatus.${key}`);
  return (status ?? "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Completed and waived items count as done. */
export function isAssignmentDone(status?: string | null): boolean {
  return status === "completed" || status === "waived";
}

/** Brand status chips: not started = dashed, in progress = Steel, done = Navy. */
export function assignmentStatusClass(status?: string | null): string {
  switch (status) {
    case "completed":
      return "bg-primary text-primary-foreground border-primary";
    case "in_progress":
      return "bg-accent text-accent-foreground border-accent";
    case "blocked":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "waived":
      return "bg-secondary text-secondary-foreground border-border";
    default:
      return "bg-transparent text-muted-foreground border-dashed border-steel/60";
  }
}

export interface AssignmentCounts {
  total: number;
  completed: number;
  waived: number;
  done: number;
  inProgress: number;
  blocked: number;
  pending: number;
}

export function countAssignmentStatuses(statuses: Array<string | null | undefined>): AssignmentCounts {
  const counts: AssignmentCounts = {
    total: statuses.length,
    completed: 0,
    waived: 0,
    done: 0,
    inProgress: 0,
    blocked: 0,
    pending: 0,
  };
  for (const s of statuses) {
    switch (s) {
      case "completed":
        counts.completed++;
        break;
      case "waived":
        counts.waived++;
        break;
      case "in_progress":
        counts.inProgress++;
        break;
      case "blocked":
        counts.blocked++;
        break;
      default:
        counts.pending++;
    }
  }
  counts.done = counts.completed + counts.waived;
  return counts;
}
