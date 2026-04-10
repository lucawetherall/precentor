import * as React from "react"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusKind =
  | "ready"
  | "incomplete"
  | "pending"
  | "admin"
  | "editor"
  | "member"
  | "available"
  | "tentative"
  | "unavailable"

interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  status: StatusKind
  label?: string
  children?: React.ReactNode
}

const STATUS_CONFIG: Record<
  StatusKind,
  { label: string; variant: BadgeProps["variant"] }
> = {
  ready: { label: "Ready", variant: "success" },
  incomplete: { label: "Incomplete", variant: "warning" },
  pending: { label: "Pending", variant: "secondary" },
  admin: { label: "Admin", variant: "default" },
  editor: { label: "Editor", variant: "secondary" },
  member: { label: "Member", variant: "outline" },
  available: { label: "Available", variant: "success" },
  tentative: { label: "Tentative", variant: "warning" },
  unavailable: { label: "Unavailable", variant: "destructive" },
}

export function StatusBadge({
  status,
  label,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <Badge
      variant={cfg.variant}
      className={cn("small-caps inline-flex items-center gap-1", className)}
      {...props}
    >
      {children}
      {label ?? cfg.label}
    </Badge>
  )
}
