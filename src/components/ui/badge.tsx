import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        success:
          "border-transparent bg-success text-success-foreground shadow hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/80",
        outline: "text-foreground",
        rubric:
          "border-transparent bg-transparent rubric px-0",
        purple:
          "border-transparent text-primary-foreground shadow bg-[var(--color-liturgical-purple)]",
        gold:
          "border-transparent text-[#2C2416] shadow bg-[var(--color-liturgical-gold)]",
        green:
          "border-transparent text-primary-foreground shadow bg-[var(--color-liturgical-green)]",
        red:
          "border-transparent text-primary-foreground shadow bg-[var(--color-liturgical-red)]",
        white:
          "border-border text-foreground bg-[var(--color-liturgical-white)]",
        rose:
          "border-transparent text-[#2C2416] shadow bg-[var(--color-liturgical-rose)]",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs font-semibold",
        md: "px-3 py-1 text-xs font-semibold",
        lg: "px-3.5 py-1 text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
