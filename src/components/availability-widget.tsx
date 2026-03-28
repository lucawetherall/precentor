'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null

interface AvailabilityWidgetProps {
  serviceId: string
  churchId: string
  currentStatus: AvailabilityStatus
  size?: 'sm' | 'md' | 'lg'
}

interface BtnConfig {
  status: Exclude<AvailabilityStatus, null>
  label: string
  symbol: string
  activeClass: string
}

const BUTTONS: BtnConfig[] = [
  { status: 'AVAILABLE',   label: 'Available',   symbol: '✓', activeClass: 'bg-green-600 border-green-600 text-white' },
  { status: 'TENTATIVE',   label: 'Maybe',       symbol: '?', activeClass: 'bg-amber-500 border-amber-500 text-white' },
  { status: 'UNAVAILABLE', label: 'Unavailable', symbol: '✗', activeClass: 'bg-red-600 border-red-600 text-white' },
]

export function AvailabilityWidget({
  serviceId,
  churchId,
  currentStatus,
  size = 'md',
}: AvailabilityWidgetProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(currentStatus)
  const { addToast } = useToast()

  async function handleClick(clicked: Exclude<AvailabilityStatus, null>) {
    const previous = status
    const next: AvailabilityStatus = status === clicked ? null : clicked
    setStatus(next)
    try {
      if (next === null) {
        const res = await fetch(`/api/churches/${churchId}/availability`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId }),
        })
        if (!res.ok) throw new Error('Failed')
      } else {
        const res = await fetch(`/api/churches/${churchId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId, status: next }),
        })
        if (!res.ok) throw new Error('Failed')
      }
    } catch {
      setStatus(previous)
      addToast('Failed to update availability. Please try again.', 'error')
    }
  }

  const sizeClasses = {
    sm: 'h-5 w-5 text-[9px] font-bold',
    md: 'h-8 w-8 text-xs font-bold',
    lg: 'h-12 w-24 flex-col gap-1 text-xs font-bold',
  }

  return (
    <div className={cn("flex", size === "lg" ? "gap-2" : "gap-1")} role="group" aria-label="Availability">
      {BUTTONS.map(({ status: btnStatus, label, symbol, activeClass }) => {
        const isActive = status === btnStatus
        return (
          <button
            key={btnStatus}
            aria-label={label}
            aria-pressed={isActive}
            onClick={(e) => { e.stopPropagation(); handleClick(btnStatus) }}
            className={cn(
              'flex items-center justify-center border transition-colors',
              sizeClasses[size],
              isActive
                ? activeClass
                : 'border-border text-muted-foreground hover:border-foreground'
            )}
          >
            <span>{symbol}</span>
            {size === 'lg' && (
              <span className="text-[10px] uppercase tracking-wider leading-none">{label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
