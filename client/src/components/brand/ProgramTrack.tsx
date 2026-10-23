import { cn } from "@/lib/utils";
import { Node } from "./NodeRule";

interface ProgramTrackProps {
  /** Number of steps (weeks). */
  total: number;
  /** Steps before this one are done; this one is current. 0 = not started, total + 1 = finished. */
  current: number;
  /** Label under the current step. */
  currentLabel?: string;
  /** "dark" on the hero surface, "light" on white panels. */
  tone?: "dark" | "light";
  /** Accessible summary, e.g. "Week 3 of 8". */
  label: string;
  className?: string;
}

/**
 * The program as a row of the Launchpad symbol's modular blocks: done blocks are solid,
 * the current block carries the alignment node, upcoming blocks are dashed outlines.
 * Blocks fill in one after another on first paint (disabled for reduced motion).
 */
export function ProgramTrack({ total, current, currentLabel, tone = "dark", label, className }: ProgramTrackProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("w-full", className)} role="img" aria-label={label}>
      <div className="flex items-end gap-[clamp(4px,1.2vw,10px)]">
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const state = step < current ? "done" : step === current ? "current" : "upcoming";
          return (
            <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-4 items-end">
                {state === "current" && <Node className={cn("h-3.5 w-3.5", dark ? "text-white" : "text-primary")} />}
              </div>
              <div
                className={cn(
                  "animate-block-fill aspect-square w-full max-w-14 rounded-[22%]",
                  state === "done" && (dark ? "bg-white/90" : "bg-primary"),
                  state === "current" &&
                    (dark
                      ? "bg-mist shadow-[0_0_0_4px_rgb(255_255_255/0.14)]"
                      : "bg-accent shadow-[0_0_0_4px_hsl(var(--steel)/0.15)]"),
                  state === "upcoming" &&
                    (dark ? "border border-dashed border-white/40" : "border border-dashed border-steel/50"),
                )}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              />
              <span
                className={cn(
                  "font-display text-[11px] tabular-nums sm:text-xs",
                  dark ? (state === "current" ? "text-white" : "text-white/65") : state === "current" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      {currentLabel && (
        <p className={cn("mt-3 font-display text-sm", dark ? "text-white/80" : "text-muted-foreground")}>{currentLabel}</p>
      )}
    </div>
  );
}
