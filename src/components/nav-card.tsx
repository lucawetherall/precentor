import * as React from "react"
import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface NavCardProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
  meta?: React.ReactNode
  href: string
  className?: string
  showArrow?: boolean
}

/**
 * The standard "card that links somewhere" used on dashboards,
 * church lists, and quick-action grids.
 */
export function NavCard({
  icon: Icon,
  title,
  subtitle,
  meta,
  href,
  className,
  showArrow = true,
}: NavCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary focus-visible:border-primary",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="h-5 w-5 shrink-0 text-primary"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="font-heading text-base font-semibold leading-tight">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
        {meta ? <div className="mt-1 text-xs">{meta}</div> : null}
      </div>
      {showArrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  )
}
