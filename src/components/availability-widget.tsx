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
  eligible?: boolean
  eligibleReason?: 'SAID' | 'NO_ROLE'
  /**
   * Whose availability this widget controls. Omitted = the signed-in user.
   * The API only allows editors+ to set someone else's availability, so
   * pass `readOnly` for other members' cells when the viewer is not an editor.
   */
  userId?: string
  /** Display name used in tooltips when the widget shows someone else's row. */
  subjectName?: string
  /** Render the current status without any buttons (no permission to change it). */
  readOnly?: boolean
}

interface BtnConfig {
  status: Exclude<AvailabilityStatus, null>
  label: string
  symbol: string
  activeClass: string
  readOnlyClass: string
}

const BUTTONS: BtnConfig[] = [
  { status: 'AVAILABLE',   label: 'Available',   symbol: '✓', activeClass: 'bg-success border-success text-success-foreground', readOnlyClass: 'text-success' },
  { status: 'TENTATIVE',   label: 'Maybe',       symbol: '?', activeClass: 'bg-warning border-warning text-warning-foreground', readOnlyClass: 'text-warning' },
  { status: 'UNAVAILABLE', label: 'Unavailable', symbol: '✗', activeClass: 'bg-destructive border-destructive text-destructive-foreground', readOnlyClass: 'text-destructive' },
]

export function AvailabilityWidget({
  serviceId,
  churchId,
  currentStatus,
  size = 'md',
  eligible,
  eligibleReason,
  userId,
  subjectName,
  readOnly = false,
}: AvailabilityWidgetProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(currentStatus)
  const { addToast } = useToast()

  if (eligible === false) {
    const tooltip = eligibleReason === 'NO_ROLE'
      ? subjectName
        ? `${subjectName} has no role required for this service`
        : "You don't have a role required for this service"
      : 'Not required for this service';
    return <span title={tooltip} className="text-muted-foreground select-none">—</span>;
  }

  if (readOnly) {
    const current = BUTTONS.find((b) => b.status === status)
    if (!current) {
      return (
        <span
          title={subjectName ? `${subjectName} hasn't responded yet` : 'No response yet'}
          className="text-muted-foreground/80 select-none"
        >
          –
        </span>
      )
    }
    return (
      <span
        title={subjectName ? `${subjectName}: ${current.label}` : current.label}
        className={cn('font-bold select-none', current.readOnlyClass)}
      >
        {current.symbol}
        <span className="sr-only">{current.label}</span>
      </span>
    )
  }

  async function handleClick(clicked: Exclude<AvailabilityStatus, null>) {
    const previous = status
    const next: AvailabilityStatus = status === clicked ? null : clicked
    setStatus(next)
    // Only include userId when targeting someone else — the API treats a
    // missing userId as "the signed-in user".
    const targetBody = userId ? { userId } : {}
    try {
      if (next === null) {
        const res = await fetch(`/api/churches/${churchId}/availability`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...targetBody, serviceId }),
        })
        if (!res.ok) throw await toApiError(res)
      } else {
        const res = await fetch(`/api/churches/${churchId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...targetBody, serviceId, status: next }),
        })
        if (!res.ok) throw await toApiError(res)
      }
    } catch (err) {
      setStatus(previous)
      addToast(friendlyAvailabilityError(err, subjectName), 'error')
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8 md:h-6 md:w-6 text-[10px] font-bold',
    md: 'h-11 w-11 md:h-9 md:w-9 text-xs font-bold',
    lg: 'h-12 w-24 flex-col gap-1 text-xs font-bold',
  }

  return (
    <div className={cn("flex", size === "lg" ? "gap-2" : "gap-1")} role="group" aria-label={subjectName ? `Availability for ${subjectName}` : 'Availability'}>
      {BUTTONS.map(({ status: btnStatus, label, symbol, activeClass }) => {
        const isActive = status === btnStatus
        return (
          <button
            key={btnStatus}
            aria-label={subjectName ? `${label} — ${subjectName}` : label}
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
              <span className="small-caps text-xs leading-none">{label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

class ApiRequestError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function toApiError(res: Response): Promise<ApiRequestError> {
  try {
    const body = await res.json()
    return new ApiRequestError(body?.error ?? 'Request failed', body?.code)
  } catch {
    return new ApiRequestError('Request failed')
  }
}

function friendlyAvailabilityError(err: unknown, subjectName?: string): string {
  if (err instanceof ApiRequestError && err.code === 'NO_ELIGIBLE_ROLE') {
    return subjectName
      ? `${subjectName} doesn't have a musical role matching this service yet — assign roles in Settings.`
      : "You haven't been given a musical role for this service yet — ask your church admin."
  }
  return 'Failed to update availability. Please try again.'
}
