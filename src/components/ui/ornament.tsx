import * as React from "react"

import { cn } from "@/lib/utils"

type OrnamentVariant = "rule" | "fleuron" | "cross"

interface OrnamentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: OrnamentVariant
  label?: string
}

const GLYPH: Record<OrnamentVariant, string> = {
  rule: "❦",
  fleuron: "❦",
  cross: "✢",
}

/**
 * A subtle prayer-book-style ornamental divider.
 *
 * - `rule` — a hairline rule with a centred fleuron. Use between major sections.
 * - `fleuron` — the glyph alone, centred. Use as a soft break.
 * - `cross` — a small cross glyph, centred. Use sparingly, for formal breaks.
 *
 * Decorative by default; screen readers skip it unless `label` is supplied.
 */
export function Ornament({
  variant = "rule",
  label,
  className,
  ...props
}: OrnamentProps) {
  const glyph = GLYPH[variant]
  const ariaProps = label
    ? { role: "separator" as const, "aria-label": label }
    : { role: "presentation" as const, "aria-hidden": true }

  if (variant === "rule") {
    return (
      <div
        {...ariaProps}
        className={cn(
          "my-8 flex items-center gap-4 text-primary/50",
          className,
        )}
        {...props}
      >
        <span className="h-px flex-1 bg-border" />
        <span className="font-heading text-lg leading-none">{glyph}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    )
  }

  return (
    <div
      {...ariaProps}
      className={cn(
        "my-6 text-center font-heading text-lg leading-none text-primary/50",
        className,
      )}
      {...props}
    >
      {glyph}
    </div>
  )
}
