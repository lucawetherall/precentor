import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Consistent empty-state block used across the app.
 * Use when a list, grid, or page has no content yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          className="h-8 w-8 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="prose-measure text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
