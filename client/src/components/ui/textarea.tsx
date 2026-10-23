import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-primary/15 bg-card px-3.5 py-2.5 text-base shadow-[0_1px_2px_hsl(var(--navy)/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-primary/30 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
