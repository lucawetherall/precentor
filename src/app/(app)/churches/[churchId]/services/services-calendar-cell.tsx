import Link from 'next/link'
import { Check, X, Minus, Plus } from 'lucide-react'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour, MemberRole, ServiceType } from '@/types'
import type {
  LiturgicalDayWithService,
  ServiceSummary,
  ServiceReadinessStatus,
} from '@/types/service-views'
import { cn } from '@/lib/utils'

interface Props {
  churchId: string
  day: LiturgicalDayWithService | null
  dateStr: string
  isOutsideMonth: boolean
  isSunday: boolean
  isToday: boolean
  role: MemberRole
}

const COLOUR_NAME: Record<LiturgicalColour, string> = {
  PURPLE: 'purple',
  WHITE: 'white',
  GOLD: 'gold',
  GREEN: 'green',
  RED: 'red',
  ROSE: 'rose',
}

const STATUS_COLOUR: Record<ServiceReadinessStatus, string> = {
  empty: 'bg-destructive',
  partial: 'bg-warning',
  ready: 'bg-success',
}

export function ServicesCalendarCell({
  churchId,
  day,
  dateStr,
  isOutsideMonth,
  isSunday,
  isToday,
  role,
}: Props) {
  const dayNumber = parseInt(dateStr.slice(8), 10)
  const isEditor = role === 'ADMIN' || role === 'EDITOR'

  if (isOutsideMonth) {
    return (
      <div className="border-r border-b border-border min-h-[150px] p-2 bg-muted opacity-40">
        <span className="text-xs text-muted-foreground font-tabular">{dayNumber}</span>
      </div>
    )
  }

  const services = day?.services ?? []
  const visibleServices = services.slice(0, 2)
  const overflowCount = Math.max(0, services.length - 2)
  const showEditorPlanCta = isEditor && isSunday && services.length === 0
  const showFeastName = Boolean(day?.cwName)

  return (
    <div className="border-r border-b border-border min-h-[150px] p-[6px_7px] flex flex-col gap-1 bg-card">
      <div className="flex items-start justify-between">
        {isToday ? (
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-[11px] font-semibold font-tabular">
            {dayNumber}
            <span className="sr-only">Today</span>
          </span>
        ) : (
          <span
            className={cn(
              'text-xs font-tabular',
              isSunday ? 'text-primary font-semibold' : 'text-muted-foreground'
            )}
          >
            {dayNumber}
          </span>
        )}
      </div>

      {day && showFeastName && (
        <p className="text-[10px] italic text-muted-foreground leading-tight">
          {day.cwName}
        </p>
      )}

      {visibleServices.map((service) => (
        <ServiceCard
          key={service.id}
          churchId={churchId}
          dateStr={dateStr}
          day={day}
          service={service}
          role={role}
        />
      ))}

      {overflowCount > 0 && (
        <Link
          href={`/churches/${churchId}/services/${dateStr}`}
          className="small-caps text-[10px] text-muted-foreground hover:text-primary underline underline-offset-2 self-start"
        >
          + {overflowCount} more
        </Link>
      )}

      {showEditorPlanCta && (
        <Link
          href={`/churches/${churchId}/services/${dateStr}?mode=edit`}
          className="mt-1 border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-sm px-2 py-1 small-caps text-[10px] text-center"
        >
          <Plus className="inline h-3 w-3 mr-1" strokeWidth={1.5} />
          Plan service
        </Link>
      )}
    </div>
  )
}

interface ServiceCardProps {
  churchId: string
  dateStr: string
  day: LiturgicalDayWithService | null
  service: ServiceSummary
  role: MemberRole
}

function ServiceCard({ churchId, dateStr, day, service, role }: ServiceCardProps) {
  const colour = day ? LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741' : '#4A6741'
  const colourName = day ? COLOUR_NAME[day.colour as LiturgicalColour] ?? 'green' : 'green'
  const title = SERVICE_TYPE_LABELS[service.serviceType as ServiceType] ?? service.serviceType
  const isEditor = role === 'ADMIN' || role === 'EDITOR'

  const hymnCount = service.musicPreview.filter((p) => p.slotType === 'HYMN').length
  const anthemCount = service.musicPreview.filter((p) => p.slotType === 'ANTHEM').length
  const metaPieces: string[] = []
  if (service.time) metaPieces.push(service.time)
  if (isEditor) {
    if (hymnCount > 0) metaPieces.push(`${hymnCount} ${hymnCount === 1 ? 'hymn' : 'hymns'}`)
    if (anthemCount > 0) metaPieces.push(`${anthemCount} ${anthemCount === 1 ? 'anthem' : 'anthems'}`)
  } else {
    metaPieces.push(colourName)
  }

  const previews = service.musicPreview.slice(0, 2)

  return (
    <Link
      href={`/churches/${churchId}/services/${dateStr}`}
      aria-label={`${title} on ${dateStr}`}
      className="block rounded-sm bg-card border border-border pl-2 pr-2 py-1 hover:border-primary transition-colors"
      style={{ borderLeftWidth: '3px', borderLeftColor: colour }}
    >
      <div className="font-heading text-[11px] font-semibold leading-tight">{title}</div>
      <div className="small-caps text-[10px] text-muted-foreground mt-0.5">
        {metaPieces.join(' · ')}
      </div>

      {previews.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {previews.map((p) => (
            <div
              key={p.id}
              className="text-[10px] italic text-muted-foreground leading-tight overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {p.title}
            </div>
          ))}
        </div>
      )}

      {isEditor ? (
        <div className="flex items-center gap-2 mt-1 small-caps text-[9px] text-muted-foreground">
          <StatusDot status={service.musicStatus} label="music" />
          <StatusDot status={service.rotaStatus} label="rota" />
        </div>
      ) : (
        <div className="mt-1 small-caps text-[9px] text-muted-foreground flex items-center gap-1">
          <AvailabilityIcon status={service.userAvailability} />
          <span>{availabilityLabel(service.userAvailability)}</span>
        </div>
      )}
    </Link>
  )
}

function StatusDot({ status, label }: { status: ServiceReadinessStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn('inline-block w-[6px] h-[6px] rounded-full', STATUS_COLOUR[status])}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

function AvailabilityIcon({ status }: { status: ServiceSummary['userAvailability'] }) {
  if (status === 'AVAILABLE') return <Check className="h-3 w-3 text-success" strokeWidth={2} aria-hidden="true" />
  if (status === 'UNAVAILABLE') return <X className="h-3 w-3 text-destructive" strokeWidth={2} aria-hidden="true" />
  if (status === 'TENTATIVE') return <Minus className="h-3 w-3 text-warning" strokeWidth={2} aria-hidden="true" />
  return <Minus className="h-3 w-3 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
}

function availabilityLabel(status: ServiceSummary['userAvailability']): string {
  if (status === 'AVAILABLE') return 'available'
  if (status === 'UNAVAILABLE') return 'unavailable'
  if (status === 'TENTATIVE') return 'tentative'
  return 'not set'
}
