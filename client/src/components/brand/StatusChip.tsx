import { cn } from "@/lib/utils";
import { assignmentStatusClass, assignmentStatusLabel } from "@/lib/roadmapStatus";

/** Status chip for roadmap and curriculum items (not started = dashed, in progress = Steel, done = Navy). */
export function StatusChip({ status, className }: { status?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-display text-xs font-medium",
        assignmentStatusClass(status),
        className,
      )}
    >
      {assignmentStatusLabel(status)}
    </span>
  );
}
