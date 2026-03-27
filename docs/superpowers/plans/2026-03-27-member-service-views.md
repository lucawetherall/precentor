# Member Service Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all choir roles a clean list/agenda/calendar view of upcoming services with inline availability registration, and a read-only service detail page with music, readings, and collect.

**Architecture:** Role-aware rendering within existing routes (`/sundays` and `/sundays/[date]`). A `SundaysViewWrapper` client component handles the three-view toggle (URL search params). The service detail page renders `MemberServiceView` (all roles) or the existing `ServicePlanner` (editors in `?mode=edit`). A new `AvailabilityWidget` component handles Yes/Maybe/No for all roles.

**Tech Stack:** Next.js 16 App Router (async params/searchParams), React 19, TypeScript, Drizzle ORM + PostgreSQL, Vitest + @testing-library/react, Tailwind CSS 4, `cn()` utility, `useToast` → `addToast`.

---

## File Map

**New files:**
- `src/types/service-views.ts` — `LiturgicalDayWithService`, `MusicSlotPreview`, `PopulatedMusicSlot` types
- `src/components/availability-widget.tsx` — reusable ✓/?/✗ availability buttons (client)
- `src/components/__tests__/availability-widget.test.tsx` — unit tests
- `src/app/(app)/churches/[churchId]/sundays/sundays-view-wrapper.tsx` — client wrapper with view toggle
- `src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx` — list view (extracted + enhanced)
- `src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx` — month-grouped agenda view
- `src/app/(app)/churches/[churchId]/sundays/sundays-calendar.tsx` — month-grid calendar view (client)
- `src/app/(app)/churches/[churchId]/sundays/__tests__/sundays-calendar.test.ts` — pure function tests
- `src/app/(app)/churches/[churchId]/sundays/[date]/member-service-view.tsx` — read-only service detail (server)
- `src/app/(app)/churches/[churchId]/sundays/[date]/service-music-list.tsx` — read-only music slot list
- `src/app/(app)/churches/[churchId]/sundays/[date]/__tests__/service-music-list.test.tsx` — unit tests

**Modified files:**
- `src/app/api/churches/[churchId]/availability/route.ts` — add DELETE handler
- `src/app/(app)/churches/[churchId]/sundays/page.tsx` — add auth, richer data fetch, use `SundaysViewWrapper`
- `src/app/(app)/churches/[churchId]/sundays/[date]/page.tsx` — add auth, role-aware render, edit mode

---

## Task 1: Shared types

**Files:**
- Create: `src/types/service-views.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/service-views.ts
import type { LiturgicalSeason, LiturgicalColour, MusicSlotType } from '@/types'

export interface MusicSlotPreview {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  title: string  // resolved from hymn.firstLine, anthem.title, or freeText
}

export interface ServiceSummary {
  id: string
  serviceType: string
  time: string | null
  status: string
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  musicPreview: MusicSlotPreview[]
}

export interface LiturgicalDayWithService {
  id: string
  date: string       // "YYYY-MM-DD"
  cwName: string
  season: LiturgicalSeason
  colour: LiturgicalColour
  collect: string | null
  service: ServiceSummary | null
}

export interface PopulatedMusicSlot {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  freeText: string | null
  notes: string | null
  hymnBook: string | null
  hymnNumber: number | null
  hymnFirstLine: string | null
  hymnTuneName: string | null
  anthemTitle: string | null
  anthemComposer: string | null
  anthemVoicing: string | null
}
```

- [ ] **Step 2: Run tests to confirm no TypeScript errors**

```bash
npx tsc --noEmit
```
Expected: no errors referencing `service-views.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/service-views.ts
git commit -m "feat: add service-views shared types"
```

---

## Task 2: DELETE availability endpoint

**Files:**
- Modify: `src/app/api/churches/[churchId]/availability/route.ts`

The existing POST handler upserts availability. We need a DELETE handler to remove the row (deselect). It follows the same auth pattern.

- [ ] **Step 1: Add the DELETE handler at the end of the route file**

```ts
// Add after the existing POST export

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params
  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) return error

  let body: { userId?: string; serviceId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, serviceId } = body
  if (!serviceId) {
    return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
  }

  const targetUserId = userId || user!.id
  if (targetUserId !== user!.id && !hasMinRole(membership!.role as MemberRole, 'EDITOR')) {
    return NextResponse.json({ error: 'You can only update your own availability' }, { status: 403 })
  }

  try {
    await db
      .delete(availability)
      .where(and(eq(availability.userId, targetUserId), eq(availability.serviceId, serviceId)))
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Failed to delete availability', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
```

Note: `availability` (the Drizzle table) is already imported in the file. `delete` is a Drizzle method on `db`. `and`, `eq` are already imported. `hasMinRole` is already imported. `logger` is already imported.

- [ ] **Step 2: Run tests to confirm no TS errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/churches/\[churchId\]/availability/route.ts
git commit -m "feat: add DELETE handler to availability endpoint"
```

---

## Task 3: AvailabilityWidget (TDD)

**Files:**
- Create: `src/components/availability-widget.tsx`
- Create: `src/components/__tests__/availability-widget.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/__tests__/availability-widget.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AvailabilityWidget } from '../availability-widget'

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AvailabilityWidget', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })

  it('renders three availability buttons', () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" />)
    expect(screen.getByRole('button', { name: 'Available' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeInTheDocument()
  })

  it('marks the correct button as pressed when currentStatus is set', () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    expect(screen.getByRole('button', { name: 'Available' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('fires POST with AVAILABLE when clicking Available from null state', async () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Available' }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/churches/c1/availability',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ serviceId: 's1', status: 'AVAILABLE' }),
        })
      )
    )
  })

  it('fires DELETE when clicking the active button to deselect', async () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Available' }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/churches/c1/availability',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ serviceId: 's1' }),
        })
      )
    )
  })

  it('reverts to previous status on API error', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Maybe' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Available' })).toHaveAttribute('aria-pressed', 'true')
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/__tests__/availability-widget.test.tsx
```
Expected: FAIL — `availability-widget` module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/availability-widget.tsx
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
    lg: 'h-14 w-[72px] flex-col gap-0.5 text-xs font-bold',
  }

  return (
    <div className="flex gap-1" role="group" aria-label="Availability">
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
              <span className="text-[9px] uppercase tracking-wider">{label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/components/__tests__/availability-widget.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/availability-widget.tsx src/components/__tests__/availability-widget.test.tsx
git commit -m "feat: add AvailabilityWidget with optimistic updates"
```

---

## Task 4: SundaysList component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx`

This extracts the existing list rendering and adds the availability widget. No separate test needed — covered by integration in Task 7.

- [ ] **Step 1: Create the component**

```tsx
// src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx
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
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/sundays/sundays-list.tsx
git commit -m "feat: add SundaysList component with availability widget"
```

---

## Task 5: SundaysAgenda component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'

interface SundaysAgendaProps {
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

export function SundaysAgenda({ churchId, days }: SundaysAgendaProps) {
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

                  {/* Body */}
                  <Link
                    href={`/churches/${churchId}/sundays/${day.date}`}
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
                    ) : null}
                  </Link>

                  {/* Availability */}
                  {day.service && (
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-4 border-l border-border flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
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
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/sundays/sundays-agenda.tsx
git commit -m "feat: add SundaysAgenda component"
```

---

## Task 6: SundaysCalendar (TDD)

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/sundays-calendar.tsx`
- Create: `src/app/(app)/churches/[churchId]/sundays/__tests__/sundays-calendar.test.ts`

The calendar exports two pure functions (`buildMonthGrid`, `isHolyDay`) that are tested separately from the React component.

- [ ] **Step 1: Write failing tests for the pure functions**

```ts
// src/app/(app)/churches/[churchId]/sundays/__tests__/sundays-calendar.test.ts
import { describe, it, expect } from 'vitest'
import { buildMonthGrid, isHolyDay } from '../sundays-calendar'

describe('buildMonthGrid', () => {
  it('April 2026 starts Wednesday — 2 null cells before day 1', () => {
    const grid = buildMonthGrid(2026, 3) // month=3 is April (0-indexed)
    expect(grid[0]).toBeNull()           // Mon col: empty
    expect(grid[1]).toBeNull()           // Tue col: empty
    expect(grid[2]).toBe('2026-04-01')   // Wed col: April 1
    expect(grid[6]).toBe('2026-04-05')   // Sun col: first Sunday (Palm Sunday)
  })

  it('total cells is always a multiple of 7', () => {
    for (let m = 0; m < 12; m++) {
      expect(buildMonthGrid(2026, m).length % 7).toBe(0)
    }
  })

  it('January 2026 starts Thursday — 3 null cells before day 1', () => {
    const grid = buildMonthGrid(2026, 0)
    expect(grid[0]).toBeNull()           // Mon: empty
    expect(grid[1]).toBeNull()           // Tue: empty
    expect(grid[2]).toBeNull()           // Wed: empty
    expect(grid[3]).toBe('2026-01-01')   // Thu: Jan 1
  })

  it('contains the correct number of days in the month', () => {
    const april = buildMonthGrid(2026, 3).filter(Boolean)
    expect(april).toHaveLength(30)
    const feb = buildMonthGrid(2026, 1).filter(Boolean) // 2026 not leap
    expect(feb).toHaveLength(28)
  })
})

describe('isHolyDay', () => {
  it('returns true for Good Friday (HOLY_WEEK season, Friday)', () => {
    expect(isHolyDay('2026-04-10', 'HOLY_WEEK')).toBe(true)
  })

  it('returns false for Palm Sunday (HOLY_WEEK season, Sunday)', () => {
    expect(isHolyDay('2026-04-05', 'HOLY_WEEK')).toBe(false)
  })

  it('returns false for an ordinary Sunday (non HOLY_WEEK)', () => {
    expect(isHolyDay('2026-05-03', 'EASTER')).toBe(false)
  })

  it('returns true for Maundy Thursday (HOLY_WEEK season, Thursday)', () => {
    expect(isHolyDay('2026-04-09', 'HOLY_WEEK')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/\(app\)/churches/\[churchId\]/sundays/__tests__/sundays-calendar.test.ts
```
Expected: FAIL — `sundays-calendar` module not found.

- [ ] **Step 3: Implement the component (pure functions first, then the React component)**

```tsx
// src/app/(app)/churches/[churchId]/sundays/sundays-calendar.tsx
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

interface SundaysCalendarProps {
  churchId: string
  days: LiturgicalDayWithService[]
}

export function SundaysCalendar({ churchId, days }: SundaysCalendarProps) {
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
          const isHolyDayCell =
            liturgicalDay && !hasService && isHolyDay(dateStr!, liturgicalDay.season)
          const colour = liturgicalDay
            ? (LITURGICAL_COLOURS[liturgicalDay.colour as LiturgicalColour] ?? '#4A6741')
            : null

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

                  {isHolyDayCell && liturgicalDay && (
                    <div
                      className="text-[9px] font-mono px-1 py-0.5 mb-1 leading-tight"
                      style={{
                        color: colour!,
                        backgroundColor: colour! + '22',
                      }}
                    >
                      {liturgicalDay.cwName}
                    </div>
                  )}

                  {hasService && liturgicalDay && (
                    <div>
                      <Link href={`/churches/${churchId}/sundays/${dateStr}`}>
                        <div
                          className="border-l-[3px] pl-1.5 mb-1.5 hover:opacity-80"
                          style={{ borderColor: colour! }}
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
```

- [ ] **Step 4: Run pure function tests to confirm they pass**

```bash
npx vitest run src/app/\(app\)/churches/\[churchId\]/sundays/__tests__/sundays-calendar.test.ts
```
Expected: 8 tests PASS.

- [ ] **Step 5: Run full test suite to check nothing is broken**

```bash
npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/sundays/sundays-calendar.tsx \
        src/app/\(app\)/churches/\[churchId\]/sundays/__tests__/sundays-calendar.test.ts
git commit -m "feat: add SundaysCalendar component with month grid"
```

---

## Task 7: SundaysViewWrapper + update sundays/page.tsx

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/sundays-view-wrapper.tsx`
- Modify: `src/app/(app)/churches/[churchId]/sundays/page.tsx`

- [ ] **Step 1: Create SundaysViewWrapper (client component)**

The wrapper reads `?view` from the URL, persists to `localStorage`, renders the appropriate view.

```tsx
// src/app/(app)/churches/[churchId]/sundays/sundays-view-wrapper.tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { SundaysList } from './sundays-list'
import { SundaysAgenda } from './sundays-agenda'
import { SundaysCalendar } from './sundays-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'
import type { MemberRole } from '@/types'

type ViewMode = 'list' | 'agenda' | 'calendar'

interface SundaysViewWrapperProps {
  churchId: string
  userId: string
  role: MemberRole
  liturgicalDays: LiturgicalDayWithService[]
}

const LS_KEY = 'precentor:sundays-view'
const VALID_VIEWS: ViewMode[] = ['list', 'agenda', 'calendar']

export function SundaysViewWrapper({
  churchId,
  userId,
  role,
  liturgicalDays,
}: SundaysViewWrapperProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlView = searchParams.get('view') as ViewMode | null
  const isValidUrl = urlView && VALID_VIEWS.includes(urlView)

  // Derive active view: URL → localStorage → default
  let view: ViewMode = 'list'
  if (isValidUrl) {
    view = urlView
  } else if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null
    if (stored && VALID_VIEWS.includes(stored)) view = stored
  }

  useEffect(() => {
    if (isValidUrl) localStorage.setItem(LS_KEY, urlView)
  }, [urlView, isValidUrl])

  function setView(v: ViewMode) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', v)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-semibold">Upcoming Sundays</h1>
        <div className="flex border border-border overflow-hidden">
          {VALID_VIEWS.map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-2 text-sm capitalize transition-colors',
                i > 0 && 'border-l border-border',
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' && <SundaysList churchId={churchId} days={liturgicalDays} />}
      {view === 'agenda' && <SundaysAgenda churchId={churchId} days={liturgicalDays} />}
      {view === 'calendar' && <SundaysCalendar churchId={churchId} days={liturgicalDays} />}
    </>
  )
}
```

- [ ] **Step 2: Rewrite sundays/page.tsx**

The page now calls auth, fetches richer data, and wraps output in `<Suspense>` (required because `SundaysViewWrapper` uses `useSearchParams()`).

```tsx
// src/app/(app)/churches/[churchId]/sundays/page.tsx
import { db } from '@/lib/db'
import {
  liturgicalDays,
  services,
  availability,
  musicSlots,
  hymns,
  anthems,
} from '@/lib/db/schema'
import { gte, asc, eq, and, inArray } from 'drizzle-orm'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requireChurchRole } from '@/lib/auth/permissions'
import type { MemberRole } from '@/types'
import type { LiturgicalDayWithService, MusicSlotPreview } from '@/types/service-views'
import { SundaysViewWrapper } from './sundays-view-wrapper'

interface Props {
  params: Promise<{ churchId: string }>
}

export default async function SundaysPage({ params }: Props) {
  const { churchId } = await params
  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = membership!.role as MemberRole
  const today = format(new Date(), 'yyyy-MM-dd')

  let days: LiturgicalDayWithService[] = []

  try {
    const upcomingDays = await db
      .select()
      .from(liturgicalDays)
      .where(gte(liturgicalDays.date, today))
      .orderBy(asc(liturgicalDays.date))
      .limit(20)

    const dayIds = upcomingDays.map((d) => d.id)

    const churchServices =
      dayIds.length > 0
        ? await db
            .select()
            .from(services)
            .where(
              and(
                eq(services.churchId, churchId),
                inArray(services.liturgicalDayId, dayIds)
              )
            )
        : []

    const serviceIds = churchServices.map((s) => s.id)

    const userAvailability =
      serviceIds.length > 0
        ? await db
            .select()
            .from(availability)
            .where(
              and(
                eq(availability.userId, userId),
                inArray(availability.serviceId, serviceIds)
              )
            )
        : []

    const slots =
      serviceIds.length > 0
        ? await db
            .select({
              id: musicSlots.id,
              serviceId: musicSlots.serviceId,
              slotType: musicSlots.slotType,
              positionOrder: musicSlots.positionOrder,
              freeText: musicSlots.freeText,
              hymnFirstLine: hymns.firstLine,
              anthemTitle: anthems.title,
            })
            .from(musicSlots)
            .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
            .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
            .where(inArray(musicSlots.serviceId, serviceIds))
            .orderBy(asc(musicSlots.positionOrder))
        : []

    days = upcomingDays.map((day) => {
      const service = churchServices.find((s) => s.liturgicalDayId === day.id) ?? null
      if (!service) return { ...day, service: null }

      const avail = userAvailability.find((a) => a.serviceId === service.id)
      const serviceSlots = slots.filter((s) => s.serviceId === service.id)

      const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
        id: slot.id,
        slotType: slot.slotType as MusicSlotPreview['slotType'],
        positionOrder: slot.positionOrder,
        title:
          slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ?? slot.slotType,
      }))

      return {
        ...day,
        service: {
          id: service.id,
          serviceType: service.serviceType,
          time: service.time,
          status: service.status,
          userAvailability:
            (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
            null,
          musicPreview,
        },
      }
    })
  } catch {
    /* DB not available — days stays [] */
  }

  return (
    <div className="p-8 max-w-4xl">
      <Suspense>
        <SundaysViewWrapper
          churchId={churchId}
          userId={userId}
          role={role}
          liturgicalDays={days}
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/sundays/sundays-view-wrapper.tsx \
        src/app/\(app\)/churches/\[churchId\]/sundays/page.tsx
git commit -m "feat: add view toggle and auth to sundays page"
```

---

## Task 8: ServiceMusicList (TDD)

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/[date]/service-music-list.tsx`
- Create: `src/app/(app)/churches/[churchId]/sundays/[date]/__tests__/service-music-list.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/app/(app)/churches/[churchId]/sundays/[date]/__tests__/service-music-list.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServiceMusicList } from '../service-music-list'
import type { PopulatedMusicSlot } from '@/types/service-views'

const hymnSlot: PopulatedMusicSlot = {
  id: '1', slotType: 'HYMN', positionOrder: 1,
  freeText: null, notes: null,
  hymnBook: 'NEH', hymnNumber: 270,
  hymnFirstLine: 'When I survey the wondrous cross',
  hymnTuneName: 'ROCKINGHAM',
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

const anthemSlot: PopulatedMusicSlot = {
  id: '2', slotType: 'ANTHEM', positionOrder: 2,
  freeText: null, notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: 'O vos omnes', anthemComposer: 'Victoria', anthemVoicing: 'SATB',
}

const emptySlot: PopulatedMusicSlot = {
  id: '3', slotType: 'ORGAN_VOLUNTARY_PRE', positionOrder: 3,
  freeText: null, notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

const freeTextSlot: PopulatedMusicSlot = {
  id: '4', slotType: 'OTHER', positionOrder: 4,
  freeText: 'Nunc Dimittis (plainsong)', notes: null,
  hymnBook: null, hymnNumber: null, hymnFirstLine: null, hymnTuneName: null,
  anthemTitle: null, anthemComposer: null, anthemVoicing: null,
}

describe('ServiceMusicList', () => {
  it('renders a hymn with book, number, and first line', () => {
    render(<ServiceMusicList slots={[hymnSlot]} />)
    expect(screen.getByText(/NEH 270/)).toBeInTheDocument()
    expect(screen.getByText(/When I survey the wondrous cross/)).toBeInTheDocument()
  })

  it('renders an anthem with title and composer detail', () => {
    render(<ServiceMusicList slots={[anthemSlot]} />)
    expect(screen.getByText('O vos omnes')).toBeInTheDocument()
    expect(screen.getByText(/Victoria/)).toBeInTheDocument()
  })

  it('renders an empty slot as "Not yet assigned"', () => {
    render(<ServiceMusicList slots={[emptySlot]} />)
    expect(screen.getByText('Not yet assigned')).toBeInTheDocument()
  })

  it('renders freeText slots by their freeText value', () => {
    render(<ServiceMusicList slots={[freeTextSlot]} />)
    expect(screen.getByText('Nunc Dimittis (plainsong)')).toBeInTheDocument()
  })

  it('renders an empty state when no slots are provided', () => {
    render(<ServiceMusicList slots={[]} />)
    expect(screen.getByText(/No music planned/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run "src/app/\(app\)/churches/\[churchId\]/sundays/\[date\]/__tests__/service-music-list.test.tsx"
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/app/(app)/churches/[churchId]/sundays/[date]/service-music-list.tsx
import { MUSIC_SLOT_LABELS } from '@/types'
import type { MusicSlotType } from '@/types'
import type { PopulatedMusicSlot } from '@/types/service-views'

interface ServiceMusicListProps {
  slots: PopulatedMusicSlot[]
}

function resolveSlot(slot: PopulatedMusicSlot): { title: string; detail: string | null } {
  if (slot.hymnFirstLine && slot.hymnBook && slot.hymnNumber != null) {
    return {
      title: `${slot.hymnBook} ${slot.hymnNumber} — ${slot.hymnFirstLine}`,
      detail: slot.hymnTuneName ?? null,
    }
  }
  if (slot.anthemTitle) {
    const parts = [slot.anthemComposer, slot.anthemVoicing].filter(Boolean)
    return { title: slot.anthemTitle, detail: parts.length ? parts.join(' · ') : null }
  }
  if (slot.freeText) {
    return { title: slot.freeText, detail: null }
  }
  return { title: 'Not yet assigned', detail: null }
}

export function ServiceMusicList({ slots }: ServiceMusicListProps) {
  if (slots.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground italic">
          No music planned for this service.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {slots.map((slot) => {
        const { title, detail } = resolveSlot(slot)
        const isEmpty = !slot.hymnFirstLine && !slot.anthemTitle && !slot.freeText
        return (
          <div key={slot.id} className="flex gap-4 py-3 items-start">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground w-28 flex-shrink-0 pt-1">
              {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] ?? slot.slotType}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={
                  isEmpty
                    ? 'text-sm text-muted-foreground italic'
                    : 'font-heading text-base'
                }
              >
                {title}
              </p>
              {detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run "src/app/\(app\)/churches/\[churchId\]/sundays/\[date\]/__tests__/service-music-list.test.tsx"
```
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/churches/[churchId]/sundays/[date]/service-music-list.tsx" \
        "src/app/(app)/churches/[churchId]/sundays/[date]/__tests__/service-music-list.test.tsx"
git commit -m "feat: add ServiceMusicList read-only component"
```

---

## Task 9: MemberServiceView component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/sundays/[date]/member-service-view.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/app/(app)/churches/[churchId]/sundays/[date]/member-service-view.tsx
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from '@/types'
import type { LiturgicalColour, MemberRole } from '@/types'
import { hasMinRole } from '@/lib/auth/permissions'
import type { PopulatedMusicSlot } from '@/types/service-views'
import { AvailabilityWidget } from '@/components/availability-widget'
import { ServiceMusicList } from './service-music-list'

interface Reading {
  id: string
  position: string
  lectionary: string
  reference: string
  readingText: string | null
}

interface ServiceInfo {
  id: string
  serviceType: string
  time: string | null
}

interface MemberServiceViewProps {
  churchId: string
  day: {
    cwName: string
    date: string
    colour: string
    season: string
    collect: string | null
  }
  service: ServiceInfo | null
  readings: Reading[]
  musicSlots: PopulatedMusicSlot[]
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  role: MemberRole
  confirmedCount?: number
  editUrl: string
}

export function MemberServiceView({
  churchId,
  day,
  service,
  readings,
  musicSlots,
  userAvailability,
  role,
  confirmedCount,
  editUrl,
}: MemberServiceViewProps) {
  const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
  const isEditor = hasMinRole(role, 'EDITOR')

  return (
    <div className="p-8 max-w-5xl">
      {/* Back link */}
      <Link
        href={`/churches/${churchId}/sundays`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Sundays
      </Link>

      {/* Editor notice (EDITOR/ADMIN only) */}
      {isEditor && (
        <div className="flex items-center justify-between p-3 mb-4 border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Editor view</span>
            {confirmedCount !== undefined &&
              ` — ${confirmedCount} singer${confirmedCount !== 1 ? 's' : ''} confirmed`}
          </p>
          <Link
            href={editUrl}
            className="text-sm border border-border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            ✎ Edit music &amp; details
          </Link>
        </div>
      )}

      {/* Service header */}
      <div className="flex items-start gap-4 mb-6">
        <span
          aria-hidden="true"
          className="w-3 h-12 flex-shrink-0 mt-1"
          style={{ backgroundColor: colour }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {day.season.replace(/_/g, ' ')}
          </p>
          <h1 className="text-3xl font-heading font-semibold">{day.cwName}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {format(parseISO(day.date), 'EEEE d MMMM yyyy')}
            {service &&
              ` · ${SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? service.serviceType}`}
            {service?.time && ` · ${service.time}`}
          </p>
        </div>
      </div>

      {/* Availability (all roles, only if service exists) */}
      {service && (
        <div className="flex items-center gap-6 p-4 mb-6 border border-border bg-card shadow-sm">
          <div className="flex-1">
            <p className="font-medium">Are you available for this service?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              You can change this at any time.
            </p>
          </div>
          <AvailabilityWidget
            serviceId={service.id}
            churchId={churchId}
            currentStatus={userAvailability}
            size="lg"
          />
        </div>
      )}

      {/* Readings + Collect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {readings.length > 0 && (
          <div className="border border-border bg-card">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Readings
              </h2>
            </div>
            <div className="divide-y divide-border">
              {readings.map((r) => (
                <div key={r.id} className="flex gap-3 px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground w-24 flex-shrink-0 font-mono text-xs">
                    {r.position
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="font-heading">{r.reference}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {day.collect && (
          <div className="border border-border bg-card">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Collect
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm italic text-muted-foreground leading-relaxed">
                {day.collect}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Music list */}
      <div className="border border-border bg-card">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Music
          </h2>
          {service && (
            <span className="text-xs text-muted-foreground">
              {SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ??
                service.serviceType}
            </span>
          )}
        </div>
        <div className="px-4">
          <ServiceMusicList slots={musicSlots} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/churches/[churchId]/sundays/[date]/member-service-view.tsx"
git commit -m "feat: add MemberServiceView read-only layout"
```

---

## Task 10: Update service detail page

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/sundays/[date]/page.tsx`

This replaces the existing inline rendering with `MemberServiceView` (default) or the existing `ServicePlanner` (`?mode=edit`, editors only).

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/(app)/churches/[churchId]/sundays/[date]/page.tsx
import { db } from '@/lib/db'
import {
  liturgicalDays,
  readings,
  services,
  musicSlots,
  hymns,
  anthems,
  availability,
  rotaEntries,
} from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireChurchRole, hasMinRole } from '@/lib/auth/permissions'
import type { MemberRole } from '@/types'
import type { PopulatedMusicSlot } from '@/types/service-views'
import { MemberServiceView } from './member-service-view'
import { ServicePlanner } from './service-planner'

interface Props {
  params: Promise<{ churchId: string; date: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function SundayDetailPage({ params, searchParams }: Props) {
  const { churchId, date } = await params
  const { mode } = await searchParams

  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = membership!.role as MemberRole
  const isEditor = hasMinRole(role, 'EDITOR')
  const isEditMode = isEditor && mode === 'edit'

  // --- Data fetching ---
  let day: Awaited<ReturnType<typeof db.select>>['0'] | null = null
  let dayReadings: Awaited<ReturnType<typeof db.select>>[] = []
  let dayServices: Awaited<ReturnType<typeof db.select>>[] = []
  let populatedSlots: PopulatedMusicSlot[] = []
  let userAvail: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null = null
  let confirmedCount = 0

  try {
    const days = await db
      .select()
      .from(liturgicalDays)
      .where(eq(liturgicalDays.date, date))
      .limit(1)
    day = days[0] ?? null

    if (day) {
      dayReadings = await db
        .select()
        .from(readings)
        .where(eq(readings.liturgicalDayId, day.id))

      dayServices = await db
        .select()
        .from(services)
        .where(
          and(eq(services.churchId, churchId), eq(services.liturgicalDayId, day.id))
        )

      const service = dayServices[0] ?? null

      if (service) {
        const avail = await db
          .select()
          .from(availability)
          .where(
            and(
              eq(availability.userId, userId),
              eq(availability.serviceId, service.id)
            )
          )
          .limit(1)
        userAvail = (avail[0]?.status as typeof userAvail) ?? null

        populatedSlots = (await db
          .select({
            id: musicSlots.id,
            slotType: musicSlots.slotType,
            positionOrder: musicSlots.positionOrder,
            freeText: musicSlots.freeText,
            notes: musicSlots.notes,
            hymnBook: hymns.book,
            hymnNumber: hymns.number,
            hymnFirstLine: hymns.firstLine,
            hymnTuneName: hymns.tuneName,
            anthemTitle: anthems.title,
            anthemComposer: anthems.composer,
            anthemVoicing: anthems.voicing,
          })
          .from(musicSlots)
          .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
          .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
          .where(eq(musicSlots.serviceId, service.id))
          .orderBy(asc(musicSlots.positionOrder))) as PopulatedMusicSlot[]

        if (isEditor) {
          const rota = await db
            .select()
            .from(rotaEntries)
            .where(
              and(
                eq(rotaEntries.serviceId, service.id),
                eq(rotaEntries.confirmed, true)
              )
            )
          confirmedCount = rota.length
        }
      }
    }
  } catch {
    /* DB not available */
  }

  if (!day) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No liturgical data for {date}.</p>
        <Link
          href={`/churches/${churchId}/sundays`}
          className="flex items-center gap-1 text-sm text-primary underline mt-2"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to Sundays
        </Link>
      </div>
    )
  }

  const service = (dayServices[0] as {
    id: string; serviceType: string; time: string | null
  } | undefined) ?? null

  // Edit mode: existing planner (editors/admins only)
  if (isEditMode) {
    return (
      <div className="p-8 max-w-5xl">
        <Link
          href={`/churches/${churchId}/sundays/${date}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Back to service view
        </Link>
        <ServicePlanner
          churchId={churchId}
          liturgicalDayId={day.id}
          date={date}
          existingServices={dayServices as Parameters<typeof ServicePlanner>[0]['existingServices']}
        />
      </div>
    )
  }

  // Default view for all roles
  return (
    <MemberServiceView
      churchId={churchId}
      day={{
        cwName: day.cwName,
        date: day.date,
        colour: day.colour,
        season: day.season,
        collect: day.collect ?? null,
      }}
      service={service}
      readings={dayReadings as Parameters<typeof MemberServiceView>[0]['readings']}
      musicSlots={populatedSlots}
      userAvailability={userAvail}
      role={role}
      confirmedCount={isEditor ? confirmedCount : undefined}
      editUrl={`/churches/${churchId}/sundays/${date}?mode=edit`}
    />
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors. If there are type cast issues with the `dayReadings`/`dayServices` shapes, add explicit type assertions or tighten the `InferSelectModel` imports — the logic is correct.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS.

- [ ] **Step 4: Smoke test manually**

Visit `/churches/[churchId]/sundays` in the browser:
- Toggle between List, Agenda, Calendar — all three render without error
- Click ✓/? /✗ on a service card — button highlights, network tab shows POST to `/api/churches/.../availability`
- Click a service to open the detail page — see header, availability, readings, collect, music list
- Log in as an EDITOR, visit the same page — see the "Edit music & details" banner
- Click "Edit music & details" — URL changes to `?mode=edit` and the existing planner renders
- Confirm MEMBER sees no editor banner

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/churches/[churchId]/sundays/[date]/page.tsx"
git commit -m "feat: refactor service detail page with role-aware layout and edit mode"
```

---

## Done

All tasks complete. Run the full suite one final time:

```bash
npx vitest run
```

Expected output: all tests PASS, no skipped, no failures.
