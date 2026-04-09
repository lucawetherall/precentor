'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LITURGICAL_COLOURS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { cn } from '@/lib/utils'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Builds an array of date strings ("YYYY-MM-DD") for a Mon–Sun month grid.
 *  Always returns exactly 42 cells (6 rows × 7 columns). Outside-month days
 *  from the previous and next month are filled in rather than padded with nulls. */
export function buildMonthGrid(year: number, month: number): string[] {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isoFirst = (firstDay.getDay() + 6) % 7 // Mon=0 … Sun=6

  const cells: string[] = []

  // Outside-month days from the previous month, in date order
  if (isoFirst > 0) {
    const prevMonthDays = new Date(year, month, 0).getDate()
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    for (let i = isoFirst - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      cells.push(format(new Date(prevYear, prevMonth, d), 'yyyy-MM-dd'))
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'))
  }

  // Outside-month days from the next month, to fill exactly 6 rows (42 cells)
  let dayOfNext = 1
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  while (cells.length < 42) {
    cells.push(format(new Date(nextYear, nextMonth, dayOfNext), 'yyyy-MM-dd'))
    dayOfNext++
  }

  return cells
}

/**
 * Filters a list of liturgical days to only those that appear in the visible
 * month's 6-row Mon–Sun grid, including outside-month days from adjacent months.
 */
export function pickDaysForGrid(
  days: LiturgicalDayWithService[],
  year: number,
  month: number,
): LiturgicalDayWithService[] {
  const grid = buildMonthGrid(year, month)
  const visible = new Set(grid)
  return days.filter((d) => visible.has(d.date))
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
              'border-r border-b border-border px-2 py-1.5 text-center small-caps text-xs bg-muted/30',
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
          const service = liturgicalDay?.services[0] ?? null
          const hasService = Boolean(service)
          const colour = liturgicalDay
            ? (LITURGICAL_COLOURS[liturgicalDay.colour as LiturgicalColour] ?? '#4A6741')
            : null

          // Choir status colour coding for service cells
          const choirStatus = service?.choirStatus
          const choirBorderColour =
            choirStatus === 'NO_CHOIR_NEEDED' ? 'var(--warning)'
            : choirStatus === 'SAID_SERVICE_ONLY' ? 'var(--muted-foreground)'
            : choirStatus === 'NO_SERVICE' ? 'var(--destructive)'
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
                    <div className="text-[10px] text-muted-foreground/70 px-1 py-0.5 mb-1 leading-tight">
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
                          serviceId={service!.id}
                          churchId={churchId}
                          currentStatus={service!.userAvailability}
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
