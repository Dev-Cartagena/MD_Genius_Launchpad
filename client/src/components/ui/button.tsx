import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans text-[15px] font-medium transition-[background-color,box-shadow,transform,filter,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Steel → Navy pill from the guideline ("Get started")
        default:
          "btn-brand text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_hsl(var(--navy)/0.25),0_6px_16px_-6px_hsl(var(--navy)/0.45)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_2px_4px_hsl(var(--navy)/0.25),0_10px_22px_-8px_hsl(var(--navy)/0.5)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_2px_hsl(var(--destructive)/0.3)] hover:bg-destructive/90",
        // White pill with hairline ("Find out")
        outline:
          "border border-primary/15 bg-card text-foreground shadow-[0_1px_2px_hsl(var(--navy)/0.06)] hover:border-primary/30 hover:bg-white hover:shadow-[0_4px_12px_-4px_hsl(var(--navy)/0.18)]",
        // White → Mist pill ("Learn more")
        secondary:
          "btn-mist border border-primary/15 text-foreground shadow-[0_1px_2px_hsl(var(--navy)/0.06)] hover:border-primary/30 hover:shadow-[0_4px_12px_-4px_hsl(var(--navy)/0.18)]",
        ghost: "text-foreground hover:bg-primary/[0.06]",
        link: "rounded-md px-0 text-accent underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
