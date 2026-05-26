import * as React from "react"

import { cn } from "@/lib/utils"

type OrnamentVariant =
  | "rule"
  | "fleuron"
  | "cross"
  | "fleur-de-lis"
  | "cross-fleury"

interface OrnamentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: OrnamentVariant
  label?: string
}

/**
 * Prayer-book / Catholic-missal style ornaments.
 *
 * Rendered as inline SVG so they do not fall back to colour emoji on mobile
 * (Unicode dingbats like ❦ ✢ are rendered as emoji by iOS/Android system fonts).
 *
 * - `rule` — hairline rule flanking a small fleuron. Between major sections.
 * - `fleuron` — engraved trefoil leaf, centred. A soft break.
 * - `cross` — a slender Latin cross. Sparingly, for formal breaks.
 * - `fleur-de-lis` — traditional three-petal lily, an emblem of the Virgin.
 * - `cross-fleury` — equal-armed cross with trefoil terminals (Catholic /
 *   heraldic). Suits mastheads.
 */
export function Ornament({
  variant = "rule",
  label,
  className,
  ...props
}: OrnamentProps) {
  const ariaProps = label
    ? { role: "separator" as const, "aria-label": label }
    : { role: "presentation" as const, "aria-hidden": true }

  const glyph = <OrnamentGlyph variant={variant === "rule" ? "fleuron" : variant} />

  if (variant === "rule") {
    return (
      <div
        {...ariaProps}
        className={cn(
          "my-8 flex items-center gap-4 text-primary/60",
          className,
        )}
        {...props}
      >
        <span className="h-px flex-1 bg-border" />
        <span className="inline-flex h-5 w-5 items-center justify-center">{glyph}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    )
  }

  return (
    <div
      {...ariaProps}
      className={cn(
        "my-6 flex justify-center text-primary/70",
        className,
      )}
      {...props}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center">{glyph}</span>
    </div>
  )
}

function OrnamentGlyph({
  variant,
}: {
  variant: Exclude<OrnamentVariant, "rule">
}) {
  switch (variant) {
    case "fleuron":
      return <FleuronSVG />
    case "cross":
      return <LatinCrossSVG />
    case "fleur-de-lis":
      return <FleurDeLisSVG />
    case "cross-fleury":
      return <CrossFleurySVG />
  }
}

/* Engraved trefoil — three-leaf fleuron, centred on its vertical axis */
function FleuronSVG() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* central stem */}
      <path d="M12 4 L12 20" />
      {/* upper leaf */}
      <path d="M12 6 C 9 6 7 8 7.5 11 C 9.5 10.5 11 9 12 7" />
      <path d="M12 6 C 15 6 17 8 16.5 11 C 14.5 10.5 13 9 12 7" />
      {/* lower curls */}
      <path d="M12 14 C 9.5 14 7.5 16 7.5 18.5 C 10 18.5 11.5 17 12 15.5" />
      <path d="M12 14 C 14.5 14 16.5 16 16.5 18.5 C 14 18.5 12.5 17 12 15.5" />
      {/* tiny diamond bead at the heart */}
      <path d="M12 11.5 L13 12.5 L12 13.5 L11 12.5 Z" fill="currentColor" />
    </svg>
  )
}

/* Fleur-de-lis — the lily of the Virgin */
function FleurDeLisSVG() {
  return (
    <svg
      viewBox="0 0 24 28"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* central petal */}
      <path d="M12 2 C 11 7 10 10 10 14 C 10 17 11 19 12 19 C 13 19 14 17 14 14 C 14 10 13 7 12 2 Z" />
      {/* left petal — curling outward */}
      <path d="M10 11 C 7 11 4 13 4.5 17 C 6 18.5 8.5 18 10 16" />
      {/* right petal — curling outward */}
      <path d="M14 11 C 17 11 20 13 19.5 17 C 18 18.5 15.5 18 14 16" />
      {/* horizontal binding band */}
      <path d="M6.5 19 L17.5 19" />
      <path d="M6.5 21 L17.5 21" />
      {/* base teardrop */}
      <path d="M11 22 L12 26 L13 22 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Cross fleury — equal-armed cross with trefoil terminals */
function CrossFleurySVG() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* cross body */}
      <path d="M12 4 L12 20" />
      <path d="M4 12 L20 12" />
      {/* trefoils at each terminal */}
      <path d="M10.5 4.5 C 10.5 3 11 2 12 2 C 13 2 13.5 3 13.5 4.5" />
      <path d="M10.5 19.5 C 10.5 21 11 22 12 22 C 13 22 13.5 21 13.5 19.5" />
      <path d="M4.5 10.5 C 3 10.5 2 11 2 12 C 2 13 3 13.5 4.5 13.5" />
      <path d="M19.5 10.5 C 21 10.5 22 11 22 12 C 22 13 21 13.5 19.5 13.5" />
      {/* central rosette */}
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Slender Latin cross */
function LatinCrossSVG() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3 L12 21" />
      <path d="M7 9 L17 9" />
    </svg>
  )
}
