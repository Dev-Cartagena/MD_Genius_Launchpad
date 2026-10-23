import * as React from "react";
import { cn } from "@/lib/utils";

/** The guideline's white→Mist "gradient panel". Use for at most one highlighted card per page. */
export const MistPanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("mist-panel p-6", className)} {...props} />,
);
MistPanel.displayName = "MistPanel";
