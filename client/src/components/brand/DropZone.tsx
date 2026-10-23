import * as React from "react";
import { cn } from "@/lib/utils";

/** Dashed outline for upload targets and empty or not-started states. */
export const DropZone = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("dashed-zone flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground", className)}
      {...props}
    />
  ),
);
DropZone.displayName = "DropZone";
