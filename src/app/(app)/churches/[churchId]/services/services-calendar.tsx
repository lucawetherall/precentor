'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LITURGICAL_COLOURS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { cn } from '@/lib/utils'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Builds an array of date strings ("YYYY-MM-DD") or nulls for a Mon–Sun month grid. */
export function buildMonthGrid(year: number, month: number): Array<string | null> {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isoFirst = (firstDay.getDay() + 6) % 7 // Mon=0 … Sun=6

  const cells: Array<string | null> = []
  for (let i = 0; i < isoFirst; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Returns true if the day is in HOLY_WEEK but is not a Sunday. */
export function isHolyDay(dateStr: string, season: string): boolean {
  if (season !== 'HOLY_WEEK') return false
  return parseISO(dateStr).getDay() !== 0
}

interface ServicesCalendarProps {
  churchId: string
  days: LiturgicalDayWithService[]
}

export function ServicesCalendar({ churchId, days }: ServicesCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const grid = buildMonthGrid(year, month)
  const dayMap = new Map(days.map((d) => [d.date, d]))

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-1.5 border border-border hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-heading text-xl">
          {format(new Date(year, month, 1), 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="p-1.5 border border-border hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className={cn(
              'border-r border-b border-border px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-wider bg-muted/30',
              i === 6 && 'text-primary font-medium'
            )}
          >
            {h}
          </div>
        ))}

        {grid.map((dateStr, idx) => {
          const colIndex = idx % 7
          const isSundayCol = colIndex === 6
          const liturgicalDay = dateStr ? (dayMap.get(dateStr) ?? null) : null
          const hasService = Boolean(liturgicalDay?.service)
          const colour = liturgicalDay
            ? (LITURGICAL_COLOURS[liturgicalDay.colour as LiturgicalColour] ?? '#4A6741')
            : null

          // Choir status colour coding for service cells
          const choirStatus = liturgicalDay?.service?.choirStatus
          const choirBorderColour =
            choirStatus === 'NO_CHOIR_NEEDED' ? '#B45309'
            : choirStatus === 'SAID_SERVICE_ONLY' ? '#6B7280'
            : choirStatus === 'NO_SERVICE' ? '#DC2626'
            : colour

          return (
            <div
              key={idx}
              className={cn(
                'border-r border-b border-border min-h-[100px] p-1.5',
                !dateStr && 'bg-muted/20'
              )}
            >
              {dateStr && (
                <>
                  <span
                    className={cn(
                      'block font-mono text-[11px] mb-1',
                      isSundayCol
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    )}
                  >
                    {parseInt(dateStr.slice(8), 10)}
                  </span>

                  {liturgicalDay && !hasService && (
                    <div className="text-[9px] font-mono text-muted-foreground/60 px-1 py-0.5 mb-1 leading-tight">
                      {liturgicalDay.cwName}
                    </div>
                  )}

                  {hasService && liturgicalDay && (
                    <div>
                      <Link href={`/churches/${churchId}/services/${dateStr}`}>
                        <div
                          className="border-l-[3px] pl-1.5 mb-1.5 hover:opacity-80"
                          style={{ borderColor: choirBorderColour! }}
                        >
                          <p className="font-heading text-[11px] leading-snug">
                            {liturgicalDay.cwName}
                          </p>
                        </div>
                      </Link>
                      <div onClick={(e) => e.stopPropagation()}>
                        <AvailabilityWidget
                          serviceId={liturgicalDay.service!.id}
                          churchId={churchId}
                          currentStatus={liturgicalDay.service!.userAvailability}
                          size="sm"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
