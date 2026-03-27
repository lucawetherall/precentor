import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { LITURGICAL_COLOURS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'

interface SundaysListProps {
  churchId: string
  days: LiturgicalDayWithService[]
}

export function SundaysList({ churchId, days }: SundaysListProps) {
  if (days.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No liturgical calendar data available. Run the database seed to populate the calendar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {days.map((day) => (
        <div
          key={day.id}
          className="flex items-center border border-border bg-card shadow-sm hover:border-primary transition-colors overflow-hidden"
        >
          <span
            aria-hidden="true"
            className="w-2 self-stretch flex-shrink-0"
            style={{ backgroundColor: LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741' }}
          />
          <Link
            href={`/churches/${churchId}/sundays/${day.date}`}
            className="flex-1 flex items-center gap-4 p-4 min-w-0"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-muted-foreground">
                {format(parseISO(day.date), 'EEE d MMM yyyy')}
              </p>
              <p className="font-heading text-lg truncate">{day.cwName}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {day.season.replace(/_/g, ' ')}
            </span>
          </Link>
          {day.service && (
            <div
              className="px-3 flex-shrink-0 border-l border-border py-3 flex flex-col items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
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
          )}
        </div>
      ))}
    </div>
  )
}
