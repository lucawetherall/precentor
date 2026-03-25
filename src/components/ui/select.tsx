"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
    </div>
  )
})
Select.displayName = "Select"

const SelectTrigger = Select

const SelectValue = ({
  placeholder,
}: {
  placeholder?: string
}) => {
  return <option value="" disabled>{placeholder}</option>
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const SelectContent = ({
  children,
  className: _className,
  ..._props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <>{children}</>
}
/* eslint-enable @typescript-eslint/no-unused-vars */

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, children, ...props }, ref) => (
  <option ref={ref} className={cn("text-sm", className)} {...props}>
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"

const SelectGroup = ({
  children,
  ...props
}: React.OptgroupHTMLAttributes<HTMLOptGroupElement>) => (
  <optgroup {...props}>{children}</optgroup>
)

const SelectLabel = ({
  children,
  className,
  ...props
}: React.OptgroupHTMLAttributes<HTMLOptGroupElement>) => (
  <optgroup label={typeof children === "string" ? children : ""} className={className} {...props} />
)

const SelectSeparator = () => (
  <option disabled className="border-t border-border">
    ──────────
  </option>
)

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
