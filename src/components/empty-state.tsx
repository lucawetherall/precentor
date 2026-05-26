import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Ornament } from "@/components/ui/ornament"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * Consistent empty-state block used across the app.
 * Use when a list, grid, or page has no content yet.
 *
 * Visually styled like an empty page in a service book: a centred fleuron
 * crowns the title, with a quiet description below.
 */
export function EmptyState({
  icon: _icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  // `icon` is accepted for call-site compatibility but no longer rendered —
  // the missal-style fleuron is the unified empty-state ornament.
  void _icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      <Ornament
        variant="fleuron"
        className="my-0 mb-2 text-primary/55 [&_span]:h-9 [&_span]:w-9"
      />
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="prose-measure text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
