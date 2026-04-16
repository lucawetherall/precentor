"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string | null
  hint?: string
  className?: string
  children: React.ReactElement<{
    id?: string
    "aria-invalid"?: boolean
    "aria-describedby"?: string
  }>
}

/**
 * Wraps a label + input/textarea/select + optional error + optional hint.
 * Automatically wires `id`, `aria-invalid`, and `aria-describedby` onto the child.
 */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined

  const child = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  })

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {child}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
