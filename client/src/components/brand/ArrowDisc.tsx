import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** The navy arrow disc from the guideline's "Find out" button. Place it last inside a pill button. */
export function ArrowDisc({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "-mr-3 ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-150 group-hover:translate-x-0.5",
        className,
      )}
    >
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}
