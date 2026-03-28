import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { ChoirStatusBadge } from './choir-status-badge'

interface ServicesListProps {
  churchId: string
  days: LiturgicalDayWithService[]
  userRole: string
}

function groupByMonth(
  days: LiturgicalDayWithService[]
): [string, LiturgicalDayWithService[]][] {
  const map = new Map<string, LiturgicalDayWithService[]>()
  for (const day of days) {
    const key = format(parseISO(day.date), 'MMMM yyyy')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(day)
  }
  return Array.from(map.entries())
}

export function ServicesList({ churchId, days, userRole }: ServicesListProps) {
  if (days.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No liturgical calendar data available. Run the database seed to populate the calendar.
        </p>
      </div>
    )
  }

  const groups = groupByMonth(days)

  return (
    <div className="space-y-8">
      {groups.map(([month, monthDays]) => (
        <div key={month}>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground pb-2 mb-3 border-b border-border">
            {month}
          </p>
          <div className="space-y-2">
            {monthDays.map((day) => {
              const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
              return (
                <div
                  key={day.id}
                  className="flex border border-border bg-card overflow-hidden hover:border-primary transition-colors"
                >
                  {/* Date column */}
                  <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 bg-muted/30 border-r border-border">
                    <span className="font-heading text-3xl leading-none">
                      {format(parseISO(day.date), 'd')}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground mt-1">
                      {format(parseISO(day.date), 'EEE')}
                    </span>
                  </div>

                  {/* Choir status — first after date column */}
                  {day.service && (
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-3 border-r border-border flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChoirStatusBadge
                        serviceId={day.service.id}
                        churchId={churchId}
                        choirStatus={day.service.choirStatus}
                        userRole={userRole}
                      />
                    </div>
                  )}

                  {/* Body */}
                  <Link
                    href={`/churches/${churchId}/services/${day.date}`}
                    className="flex-1 p-4 min-w-0"
                  >
                    <p className="font-heading text-lg mb-1">{day.cwName}</p>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                        style={{ borderColor: colour, color: colour }}
                      >
                        {day.season.replace(/_/g, ' ')}
                      </span>
                      {day.service && (
                        <span className="text-xs text-muted-foreground">
                          {SERVICE_TYPE_LABELS[day.service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? day.service.serviceType}
                          {day.service.time ? ` · ${day.service.time}` : ''}
                        </span>
                      )}
                      {day.service && day.service.musicPreview.length > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {day.service.musicPreview.length} music
                        </span>
                      )}
                    </div>
                    {day.service ? (
                      day.service.musicPreview.length > 0 ? (
                        <div className="space-y-0.5">
                          {day.service.musicPreview.map((slot) => (
                            <p key={slot.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="opacity-40">♩</span>
                              {slot.title}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Music not yet planned</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No service planned</p>
                    )}
                  </Link>

                  {/* Availability */}
                  {day.service && (
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-4 border-l border-border flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          Availability
                        </span>
                        <AvailabilityWidget
                          serviceId={day.service.id}
                          churchId={churchId}
                          currentStatus={day.service.userAvailability}
                          size="md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
