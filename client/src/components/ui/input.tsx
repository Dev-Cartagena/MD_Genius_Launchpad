import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-primary/15 bg-card px-3.5 py-2 text-base shadow-[0_1px_2px_hsl(var(--navy)/0.04)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-primary/30 focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
