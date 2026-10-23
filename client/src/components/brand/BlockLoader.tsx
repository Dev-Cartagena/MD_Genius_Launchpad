import { cn } from "@/lib/utils";

/** Loading indicator built from the Launchpad symbol's modular blocks. */
export function BlockLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="grid grid-cols-2 gap-1" aria-hidden="true">
        <span className="h-3 w-3 rounded-[3px] bg-primary animate-block-step" />
        <span className="h-3 w-3 rounded-[3px] bg-steel animate-block-step [animation-delay:300ms]" />
        <span className="h-3 w-3 rounded-[3px] bg-primary animate-block-step [animation-delay:900ms]" />
        <span className="h-3 w-3 rounded-[3px] bg-primary animate-block-step [animation-delay:600ms]" />
      </div>
      <span className="font-display text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
