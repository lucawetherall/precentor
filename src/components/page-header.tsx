import * as React from "react"

import { cn } from "@/lib/utils"
import { Ornament } from "@/components/ui/ornament"

interface PageHeaderProps {
  /**
   * Small-caps eyebrow shown above the title. The kind of label that sits
   * over a missal section opening — date, season, or context.
   */
  eyebrow?: React.ReactNode
  /** The page title (rendered as h1 by default). */
  title: React.ReactNode
  /** A short subtitle in italic, sitting beneath the title. */
  subtitle?: React.ReactNode
  /** Right-hand actions (buttons, view toggles, etc.). */
  actions?: React.ReactNode
  /**
   * Render the masthead's hairline-with-fleuron under the title.
   * Default `true`. Set `false` when the page already has its own divider.
   */
  ornament?: boolean
  /** Override the heading level if the page needs a deeper hierarchy. */
  as?: "h1" | "h2"
  className?: string
}

/**
 * Prayer-book / Catholic-missal style masthead used at the top of every
 * authenticated page. Visual identity:
 *
 *   ┌─── EYEBROW (small caps) ──────┐    ┌── ACTIONS ──┐
 *   │  Title (Cormorant Garamond)   │    │             │
 *   │  Italic subtitle              │    │             │
 *   ├─────────  ❦  ─────────────────┤
 *
 * The hairline-with-fleuron underneath gives every page the unmistakable
 * feel of opening a section in a service book.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  ornament = true,
  as = "h1",
  className,
}: PageHeaderProps) {
  const Heading = as
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="small-caps text-xs text-muted-foreground mb-2">
              {eyebrow}
            </p>
          ) : null}
          <Heading className="font-heading text-3xl sm:text-[2rem] font-semibold leading-[1.15] tracking-tight text-balance">
            {title}
          </Heading>
          {subtitle ? (
            <p className="mt-1.5 text-sm italic text-muted-foreground text-balance">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        ) : null}
      </div>
      {ornament ? (
        <Ornament variant="rule" className="my-5 text-primary/60" />
      ) : null}
    </header>
  )
}
