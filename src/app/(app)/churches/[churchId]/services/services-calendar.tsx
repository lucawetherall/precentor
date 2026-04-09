'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { MemberRole } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { ServicesCalendarHeader } from './services-calendar-header'
import { ServicesCalendarSeasonRibbon } from './services-calendar-season-ribbon'
import { ServicesCalendarCell } from './services-calendar-cell'

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

interface Props {
  churchId: string
  days: LiturgicalDayWithService[]
  role: MemberRole
}

export function ServicesCalendar({ churchId, days, role }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])
  const visibleDays = useMemo(() => pickDaysForGrid(days, year, month), [days, year, month])
  const dayByDate = useMemo(() => {
    const map = new Map<string, LiturgicalDayWithService>()
    for (const d of visibleDays) map.set(d.date, d)
    return map
  }, [visibleDays])

  const serviceCount = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return visibleDays
      .filter((d) => d.date.startsWith(monthPrefix))
      .reduce((acc, d) => acc + d.services.length, 0)
  }, [visibleDays, year, month])

  const todayStr = format(now, 'yyyy-MM-dd')
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  function goPrev() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function goNext() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  function selectMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
  }

  return (
    <div>
      <ServicesCalendarHeader
        year={year}
        month={month}
        serviceCount={serviceCount}
        isCurrentMonth={isCurrentMonth}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onSelectMonth={selectMonth}
      />

      <ServicesCalendarSeasonRibbon days={visibleDays} />

      <div className="grid grid-cols-7 border-l border-t border-border">
        {DAY_HEADERS.map((label, idx) => (
          <div
            key={label}
            className={
              'border-r border-b border-border px-2 py-1.5 text-center small-caps text-xs bg-muted/30 ' +
              (idx === 6 ? 'text-primary' : 'text-muted-foreground')
            }
          >
            {label}
          </div>
        ))}

        {grid.map((dateStr) => {
          const cellYear = parseInt(dateStr.slice(0, 4), 10)
          const cellMonth = parseInt(dateStr.slice(5, 7), 10) - 1  // 0-indexed
          const cellDay = parseInt(dateStr.slice(8, 10), 10)
          const jsDay = new Date(cellYear, cellMonth, cellDay).getDay()
          const isOutsideMonth = cellMonth !== month || cellYear !== year
          const isSunday = (jsDay + 6) % 7 === 6
          const isToday = dateStr === todayStr
          const day = dayByDate.get(dateStr) ?? null

          return (
            <ServicesCalendarCell
              key={dateStr}
              churchId={churchId}
              day={day}
              dateStr={dateStr}
              isOutsideMonth={isOutsideMonth}
              isSunday={isSunday}
              isToday={isToday}
              role={role}
            />
          )
        })}
      </div>
    </div>
  )
}
