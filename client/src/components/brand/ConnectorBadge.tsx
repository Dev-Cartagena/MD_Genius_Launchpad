import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "upcoming";

interface ConnectorBadgeProps {
  state?: StepState;
  /** Step number or short label shown in the block. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Step marker built from the gradient connector: a main block with a small offset block.
 * done = Navy, current = Steel, upcoming = dashed outline.
 */
export function ConnectorBadge({ state = "upcoming", children, className }: ConnectorBadgeProps) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0", className)} aria-hidden="true">
      <span
        className={cn(
          "absolute -right-1 -top-1 h-3 w-3 rounded-[3px]",
          state === "upcoming" ? "border border-dashed border-steel/60" : "bg-steel",
        )}
      />
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-medium",
          state === "done" && "bg-brand-gradient text-white",
          state === "current" && "bg-steel text-white",
          state === "upcoming" && "border border-dashed border-steel/60 bg-card text-muted-foreground",
        )}
      >
        {state === "done" ? <Check className="h-4 w-4" strokeWidth={1.5} /> : children}
      </span>
    </span>
  );
}
