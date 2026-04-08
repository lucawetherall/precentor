import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { CHOIR_STATUS_NOTES } from './choir-status-constants'

interface ServicesListProps {
  churchId: string
  days: LiturgicalDayWithService[]
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

export function ServicesList({ churchId, days }: ServicesListProps) {
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
          <p className="small-caps text-xs text-muted-foreground pb-2 mb-3 border-b border-border">
            {month}
          </p>
          <div className="space-y-2">
            {monthDays.map((day) => {
              const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
              const hasServices = day.services.length > 0
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
                    <span className="small-caps text-xs text-muted-foreground mt-1">
                      {format(parseISO(day.date), 'EEE')}
                    </span>
                  </div>

                  {/* Body */}
                  <Link
                    href={`/churches/${churchId}/services/${day.date}`}
                    className="flex-1 p-4 min-w-0"
                  >
                    <p className="font-heading text-lg mb-1">
                      {day.cwName}
                    </p>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span
                        className="small-caps text-xs px-2 py-0.5 border rounded-sm"
                        style={{ borderColor: colour, color: colour }}
                      >
                        {day.season.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {!hasServices && (
                      <p className="text-xs text-muted-foreground italic">No service planned</p>
                    )}

                    {hasServices && (
                      <div className="space-y-3">
                        {day.services.map((service) => (
                          <div key={service.id}>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <span className="text-sm text-foreground">
                                {SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? service.serviceType}
                                {service.time ? ` · ${service.time}` : ''}
                              </span>
                              {service.choirStatus !== 'CHOIR_REQUIRED' && CHOIR_STATUS_NOTES[service.choirStatus] && (
                                <span className="text-xs italic text-muted-foreground/60">
                                  {CHOIR_STATUS_NOTES[service.choirStatus]}
                                </span>
                              )}
                              {service.musicPreview.length > 0 && (
                                <span className="small-caps text-xs text-muted-foreground/70">
                                  {service.musicPreview.length} music
                                </span>
                              )}
                            </div>
                            {service.musicPreview.length > 0 ? (
                              <div className="space-y-0.5">
                                {service.musicPreview.map((slot) => (
                                  <p key={slot.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span className="opacity-40">♩</span>
                                    {slot.title}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Music not yet planned</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>

                  {/* Availability — only when exactly one service (multiple services go through the detail page) */}
                  {day.services.length === 1 && (
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-4 border-l border-border flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="small-caps text-xs text-muted-foreground">
                          Availability
                        </span>
                        <AvailabilityWidget
                          serviceId={day.services[0].id}
                          churchId={churchId}
                          currentStatus={day.services[0].userAvailability}
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
