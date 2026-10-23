export type AssignmentStatus = "not_started" | "in_progress" | "completed" | "blocked" | "waived";

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  waived: "Waived",
};

/** Human label for an assignment status; never shows the raw value. */
export function assignmentStatusLabel(status?: string | null): string {
  if (!status) return ASSIGNMENT_STATUS_LABELS.not_started;
  return (
    ASSIGNMENT_STATUS_LABELS[status as AssignmentStatus] ??
    status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Completed and waived items count as done. */
export function isAssignmentDone(status?: string | null): boolean {
  return status === "completed" || status === "waived";
}

export function assignmentStatusClass(status?: string | null): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "blocked":
      return "bg-red-100 text-red-800 border-red-200";
    case "waived":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
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
