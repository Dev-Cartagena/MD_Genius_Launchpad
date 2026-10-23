import { cn } from "@/lib/utils";

/** The four-point alignment node from the guideline. */
export function Node({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("h-3 w-3 shrink-0 text-primary", className)}>
      <path
        fill="currentColor"
        d="M6 0C6.5 4 8 5.5 12 6C8 6.5 6.5 8 6 12C5.5 8 4 6.5 0 6C4 5.5 5.5 4 6 0Z"
      />
    </svg>
  );
}

interface NodeRuleProps {
  /** Where the node sits on the hairline. */
  node?: "start" | "end" | "both" | "none";
  className?: string;
}

/** 1px hairline with an alignment node at its crossing, used to rule off headers and sections. */
export function NodeRule({ node = "start", className }: NodeRuleProps) {
  const showStart = node === "start" || node === "both";
  const showEnd = node === "end" || node === "both";
  return (
    <div className={cn("flex items-center", className)} role="presentation">
      {showStart && <Node className="-mr-1.5" />}
      <div className="h-px flex-1 bg-primary/20" />
      {showEnd && <Node className="-ml-1.5" />}
    </div>
  );
}
