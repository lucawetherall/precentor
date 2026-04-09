# Services Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing desktop services calendar view with a refined, prayer-book-styled month grid that supplements (not replaces) the list view.

**Architecture:** Desktop-only month grid that consumes the existing `LiturgicalDayWithService[]` data (widened to support multiple services per day). Pure presentation — no new API routes, no client-side data fetching. Composed of small focused components: a header with month navigation + picker popover, a proportional liturgical season ribbon, and role-adaptive day cells with dense service previews. Mobile falls back to the list view.

**Tech Stack:** Next.js 16 (app router), React, TypeScript, Tailwind CSS v4, Drizzle ORM (Postgres), Vitest + React Testing Library, `date-fns`, `lucide-react`, shadcn-style custom primitives already in the repo.

**Spec reference:** `docs/superpowers/specs/2026-04-09-services-calendar-view-design.md`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/app/(app)/churches/[churchId]/services/lib/service-status.ts` | Pure helper functions to compute `musicStatus` and `rotaStatus` from raw rows. Testable in isolation. |
| `src/app/(app)/churches/[churchId]/services/lib/calendar-season-ribbon.ts` | Pure helper that takes a visible month's liturgical days and returns a list of proportional season segments for the ribbon. |
| `src/app/(app)/churches/[churchId]/services/services-calendar-header.tsx` | Prev/next arrows, month title with picker trigger, service count, Today button. |
| `src/app/(app)/churches/[churchId]/services/services-calendar-month-picker.tsx` | Popover content: year stepper + 12-month grid. |
| `src/app/(app)/churches/[churchId]/services/services-calendar-season-ribbon.tsx` | Renders the proportional season bands from `calendar-season-ribbon.ts`. |
| `src/app/(app)/churches/[churchId]/services/services-calendar-cell.tsx` | Day cell; dispatches to `EditorServiceCard` or `MemberServiceCard` based on role. |
| `src/app/(app)/churches/[churchId]/services/__tests__/service-status.test.ts` | Unit tests for status helpers. |
| `src/app/(app)/churches/[churchId]/services/__tests__/calendar-season-ribbon.test.ts` | Unit tests for season ribbon computation. |
| `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-cell.test.tsx` | Rendering tests for day cells. |
| `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-header.test.tsx` | Rendering + interaction tests for the header. |
| `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-month-picker.test.tsx` | Rendering + interaction tests for the picker. |

### Modified files

| File | What changes |
|---|---|
| `src/types/service-views.ts` | `service: ServiceSummary \| null` → `services: ServiceSummary[]`. Add `musicStatus` and `rotaStatus` to `ServiceSummary`. |
| `src/app/(app)/churches/[churchId]/services/page.tsx` | Destructure `membership`, fetch rotas, compute status, shape `services[]`, pass `role` through. |
| `src/app/(app)/churches/[churchId]/services/services-view-wrapper.tsx` | Accept `role` prop, pass to calendar, hide toggle + force list view below `md`. |
| `src/app/(app)/churches/[churchId]/services/services-list.tsx` | Render multiple services per day (stacked inside the body). |
| `src/app/(app)/churches/[churchId]/services/services-calendar.tsx` | **Rewritten**. Becomes a thin composition of header + ribbon + grid of cells; owns `year`/`month` state. |
| `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar.test.ts` | Add tests for the visible-month-days selector. |

### Unchanged (but referenced)

- All UI primitives (`Button`, `Popover`, `Card`, etc.) — used as-is.
- Design tokens in `globals.css` — all already exist.
- Other services-related pages (service detail, service planner, etc.).

---

## Phase 1 — Data Model Widening

### Task 1: Extract & test `musicStatus` / `rotaStatus` helpers

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/lib/service-status.ts`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/service-status.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/(app)/churches/[churchId]/services/__tests__/service-status.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeMusicStatus, computeRotaStatus } from '../lib/service-status'

describe('computeMusicStatus', () => {
  it('returns "empty" when there are no music slots', () => {
    expect(computeMusicStatus([])).toBe('empty')
  })

  it('returns "empty" when every slot has no content', () => {
    expect(
      computeMusicStatus([
        { hymnId: null, anthemId: null, freeText: null },
        { hymnId: null, anthemId: null, freeText: null },
      ])
    ).toBe('empty')
  })

  it('returns "partial" when some slots have content and others do not', () => {
    expect(
      computeMusicStatus([
        { hymnId: 'h1', anthemId: null, freeText: null },
        { hymnId: null, anthemId: null, freeText: null },
      ])
    ).toBe('partial')
  })

  it('returns "ready" when every slot has content', () => {
    expect(
      computeMusicStatus([
        { hymnId: 'h1', anthemId: null, freeText: null },
        { hymnId: null, anthemId: 'a1', freeText: null },
        { hymnId: null, anthemId: null, freeText: 'Plainsong' },
      ])
    ).toBe('ready')
  })
})

describe('computeRotaStatus', () => {
  it('returns "empty" when there are no confirmed rota entries', () => {
    expect(computeRotaStatus([])).toBe('empty')
  })

  it('returns "empty" when entries exist but none are confirmed', () => {
    expect(
      computeRotaStatus([
        { confirmed: false, voicePart: 'SOPRANO' },
        { confirmed: false, voicePart: 'ALTO' },
      ])
    ).toBe('empty')
  })

  it('returns "partial" when at least one voice part has no confirmed singer', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: true, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        // BASS missing
      ])
    ).toBe('partial')
  })

  it('returns "ready" when every voice part has at least one confirmed singer', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: true, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        { confirmed: true, voicePart: 'BASS' },
      ])
    ).toBe('ready')
  })

  it('ignores unconfirmed entries when computing coverage', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: 'SOPRANO' },
        { confirmed: false, voicePart: 'ALTO' },
        { confirmed: true, voicePart: 'TENOR' },
        { confirmed: true, voicePart: 'BASS' },
      ])
    ).toBe('partial')
  })

  it('treats members with no voice part as not counting toward any part', () => {
    expect(
      computeRotaStatus([
        { confirmed: true, voicePart: null },
      ])
    ).toBe('empty')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- service-status`

Expected: FAIL — `Cannot find module '../lib/service-status'`.

- [ ] **Step 3: Implement the helpers**

Create `src/app/(app)/churches/[churchId]/services/lib/service-status.ts`:

```typescript
import type { VoicePart } from '@/types'

export type ServiceReadinessStatus = 'empty' | 'partial' | 'ready'

interface MusicSlotRow {
  hymnId: string | null
  anthemId: string | null
  freeText: string | null
}

/**
 * Computes the "music planned" readiness of a service.
 *
 * - empty: no slots, or no slots have content
 * - partial: some slots have content, some don't
 * - ready: every slot has content
 */
export function computeMusicStatus(slots: MusicSlotRow[]): ServiceReadinessStatus {
  if (slots.length === 0) return 'empty'

  const filled = slots.filter(
    (s) => s.hymnId !== null || s.anthemId !== null || (s.freeText !== null && s.freeText !== '')
  )

  if (filled.length === 0) return 'empty'
  if (filled.length < slots.length) return 'partial'
  return 'ready'
}

interface RotaEntryRow {
  confirmed: boolean
  voicePart: VoicePart | null
}

const REQUIRED_VOICE_PARTS: VoicePart[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS']

/**
 * Computes the "choir rota coverage" readiness of a service.
 *
 * - empty: no confirmed rota entries at all
 * - partial: confirmed entries exist but at least one voice part has zero
 * - ready: every voice part (S/A/T/B) has at least one confirmed singer
 *
 * Unconfirmed entries are ignored. Entries with a null voicePart do not
 * count toward any part (they cannot satisfy coverage on their own).
 */
export function computeRotaStatus(entries: RotaEntryRow[]): ServiceReadinessStatus {
  const confirmed = entries.filter((e) => e.confirmed)
  if (confirmed.length === 0) return 'empty'

  const covered = new Set(
    confirmed
      .map((e) => e.voicePart)
      .filter((vp): vp is VoicePart => vp !== null)
  )

  const missing = REQUIRED_VOICE_PARTS.filter((vp) => !covered.has(vp))
  if (missing.length === 0) return 'ready'
  return 'partial'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- service-status`

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/lib/service-status.ts src/app/\(app\)/churches/\[churchId\]/services/__tests__/service-status.test.ts
git commit -m "feat(services): add music/rota status computation helpers"
```

---

### Task 2: Widen `LiturgicalDayWithService` type to hold multiple services + status fields

**Files:**
- Modify: `src/types/service-views.ts`
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/services-list.tsx` (minimal change to compile)
- Modify: `src/app/(app)/churches/[churchId]/services/services-calendar.tsx` (minimal change to compile)

This task is a **pure type widening**. It changes the shape so every consumer reads `services[]` instead of `service`. The old calendar and list continue to render the first service only — visual behaviour is unchanged. Subsequent tasks will add proper multi-service rendering and new data.

- [ ] **Step 1: Update the type**

Replace `src/types/service-views.ts` entirely:

```typescript
import type { LiturgicalSeason, LiturgicalColour, MusicSlotType } from '@/types'

export interface MusicSlotPreview {
  id: string
  slotType: MusicSlotType
  positionOrder: number
  title: string  // resolved from hymn.firstLine, anthem.title, or freeText
}

export type ServiceReadinessStatus = 'empty' | 'partial' | 'ready'

export interface ServiceSummary {
  id: string
  serviceType: string
  time: string | null
  status: string
  choirStatus: string
  userAvailability: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  musicPreview: MusicSlotPreview[]
  musicStatus: ServiceReadinessStatus
  rotaStatus: ServiceReadinessStatus
}

export interface LiturgicalDayWithService {
  id: string
  date: string       // "YYYY-MM-DD"
  cwName: string
  season: LiturgicalSeason
  colour: LiturgicalColour
  collect: string | null
  services: ServiceSummary[]
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

- [ ] **Step 2: Update `services/page.tsx` to build the new shape (interim — no rota query yet)**

In `src/app/(app)/churches/[churchId]/services/page.tsx`, replace the `.map` that builds `days` (lines ~103–132 in the current file) so each day carries `services: []` or `services: [singleService]`. Leave all query logic identical for now.

Old block to replace:
```typescript
    days = upcomingDays.map((day) => {
      const service = serviceByDayId.get(day.id) ?? null
      if (!service) return { ...day, service: null }

      const avail = availByServiceId.get(service.id)
      const serviceSlots = slotsByServiceId.get(service.id) ?? []

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
          choirStatus: service.choirStatus,
          userAvailability:
            (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
            null,
          musicPreview,
        },
      }
    })
```

New block:
```typescript
    days = upcomingDays.map((day) => {
      const service = serviceByDayId.get(day.id) ?? null
      if (!service) return { ...day, services: [] }

      const avail = availByServiceId.get(service.id)
      const serviceSlots = slotsByServiceId.get(service.id) ?? []

      const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
        id: slot.id,
        slotType: slot.slotType as MusicSlotPreview['slotType'],
        positionOrder: slot.positionOrder,
        title:
          slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ?? slot.slotType,
      }))

      return {
        ...day,
        services: [
          {
            id: service.id,
            serviceType: service.serviceType,
            time: service.time,
            status: service.status,
            choirStatus: service.choirStatus,
            userAvailability:
              (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
              null,
            musicPreview,
            musicStatus: 'empty' as const,
            rotaStatus: 'empty' as const,
          },
        ],
      }
    })
```

(Status values are hardcoded to `'empty'` for now; Task 3 will replace them with the computed values.)

- [ ] **Step 3: Update `services-list.tsx` to compile against the new type**

In `src/app/(app)/churches/[churchId]/services/services-list.tsx`, add a single helper line at the top of each day's `.map` callback and replace `day.service` references with `service`. This keeps the existing single-service rendering behaviour; Task 4 will add multi-service rendering.

Find the `.map((day) => {` block (around line 47) and change:

```tsx
            {monthDays.map((day) => {
              const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
              return (
```

to:

```tsx
            {monthDays.map((day) => {
              const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
              const service = day.services[0] ?? null
              return (
```

Then replace every `day.service` with `service` in the JSX for this map body (there are 7 occurrences between the `<p className="font-heading ...">` line and the closing `</div>` of the row).

- [ ] **Step 4: Update `services-calendar.tsx` (old implementation) to compile**

In `src/app/(app)/churches/[churchId]/services/services-calendar.tsx`, find the `const hasService = Boolean(liturgicalDay?.service)` line (around line 91) and change the block of service references.

Replace:
```tsx
          const hasService = Boolean(liturgicalDay?.service)
```

with:
```tsx
          const service = liturgicalDay?.services[0] ?? null
          const hasService = Boolean(service)
```

Then replace every `liturgicalDay.service` (and `liturgicalDay!.service`) in the rest of the function with `service`. There are occurrences inside the `{hasService && liturgicalDay && (...)}` block for the `choirStatus`, `LinkHref`, and `AvailabilityWidget` usage.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: PASS — no errors.

- [ ] **Step 6: Run build and tests**

Run: `npm run build && npm test -- services`

Expected: build succeeds; all existing services tests still green.

- [ ] **Step 7: Commit**

```bash
git add src/types/service-views.ts src/app/\(app\)/churches/\[churchId\]/services/page.tsx src/app/\(app\)/churches/\[churchId\]/services/services-list.tsx src/app/\(app\)/churches/\[churchId\]/services/services-calendar.tsx
git commit -m "refactor(services): widen LiturgicalDayWithService to services[]"
```

---

### Task 3: Fetch rota entries + wire real `musicStatus`/`rotaStatus` into `services/page.tsx`

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx`

This task adds a fourth query (confirmed rota entries joined with voice parts), computes both status values per service using the helpers from Task 1, and replaces the `'empty'` placeholders from Task 2.

- [ ] **Step 1: Add the imports**

In `src/app/(app)/churches/[churchId]/services/page.tsx`, replace the import block at the top:

Find:
```typescript
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
import type { LiturgicalDayWithService, MusicSlotPreview } from '@/types/service-views'
import { ServicesViewWrapper } from './services-view-wrapper'
```

Replace with:
```typescript
import { db } from '@/lib/db'
import {
  liturgicalDays,
  services,
  availability,
  musicSlots,
  hymns,
  anthems,
  rotaEntries,
  churchMemberships,
} from '@/lib/db/schema'
import { gte, asc, eq, and, inArray } from 'drizzle-orm'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requireChurchRole } from '@/lib/auth/permissions'
import type { LiturgicalDayWithService, MusicSlotPreview } from '@/types/service-views'
import type { VoicePart } from '@/types'
import { ServicesViewWrapper } from './services-view-wrapper'
import { computeMusicStatus, computeRotaStatus } from './lib/service-status'
```

- [ ] **Step 2: Add the rota query block**

In the same file, find this block (inside the `try`):

```typescript
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
```

Replace it with the same query **plus** a widened column list that includes `hymnId` and `anthemId`, **plus** the rota query **plus** a raw-slots query for status computation:

```typescript
    const slots =
      serviceIds.length > 0
        ? await db
            .select({
              id: musicSlots.id,
              serviceId: musicSlots.serviceId,
              slotType: musicSlots.slotType,
              positionOrder: musicSlots.positionOrder,
              freeText: musicSlots.freeText,
              hymnId: musicSlots.hymnId,
              anthemId: musicSlots.anthemId,
              hymnFirstLine: hymns.firstLine,
              anthemTitle: anthems.title,
            })
            .from(musicSlots)
            .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
            .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
            .where(inArray(musicSlots.serviceId, serviceIds))
            .orderBy(asc(musicSlots.positionOrder))
        : []

    const rotas =
      serviceIds.length > 0
        ? await db
            .select({
              serviceId: rotaEntries.serviceId,
              confirmed: rotaEntries.confirmed,
              voicePart: churchMemberships.voicePart,
            })
            .from(rotaEntries)
            .innerJoin(
              churchMemberships,
              and(
                eq(rotaEntries.userId, churchMemberships.userId),
                eq(churchMemberships.churchId, churchId)
              )
            )
            .where(inArray(rotaEntries.serviceId, serviceIds))
        : []
```

- [ ] **Step 3: Build the rota lookup map**

Immediately after the existing `slotsByServiceId` map construction, add a `rotasByServiceId` map. Find this block:

```typescript
    const slotsByServiceId = new Map<string, typeof slots>();
    for (const slot of slots) {
      const existing = slotsByServiceId.get(slot.serviceId) ?? [];
      existing.push(slot);
      slotsByServiceId.set(slot.serviceId, existing);
    }
```

Add immediately after it:

```typescript
    const rotasByServiceId = new Map<string, typeof rotas>();
    for (const entry of rotas) {
      const existing = rotasByServiceId.get(entry.serviceId) ?? [];
      existing.push(entry);
      rotasByServiceId.set(entry.serviceId, existing);
    }
```

- [ ] **Step 4: Wire the computed statuses into the `.map`**

Find the `days = upcomingDays.map((day) => {` block and replace the hardcoded `'empty'` statuses from Task 2 with real computations. Replace the whole `.map` body with this version:

```typescript
    days = upcomingDays.map((day) => {
      const service = serviceByDayId.get(day.id) ?? null
      if (!service) return { ...day, services: [] }

      const avail = availByServiceId.get(service.id)
      const serviceSlots = slotsByServiceId.get(service.id) ?? []
      const serviceRotas = rotasByServiceId.get(service.id) ?? []

      const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
        id: slot.id,
        slotType: slot.slotType as MusicSlotPreview['slotType'],
        positionOrder: slot.positionOrder,
        title:
          slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ?? slot.slotType,
      }))

      const musicStatus = computeMusicStatus(
        serviceSlots.map((s) => ({
          hymnId: s.hymnId,
          anthemId: s.anthemId,
          freeText: s.freeText,
        }))
      )

      const rotaStatus = computeRotaStatus(
        serviceRotas.map((r) => ({
          confirmed: r.confirmed,
          voicePart: r.voicePart as VoicePart | null,
        }))
      )

      return {
        ...day,
        services: [
          {
            id: service.id,
            serviceType: service.serviceType,
            time: service.time,
            status: service.status,
            choirStatus: service.choirStatus,
            userAvailability:
              (avail?.status as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null) ??
              null,
            musicPreview,
            musicStatus,
            rotaStatus,
          },
        ],
      }
    })
```

- [ ] **Step 5: Run typecheck + build + tests**

Run: `npm run typecheck && npm run build && npm test -- services`

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/page.tsx
git commit -m "feat(services): fetch rotas and compute music/rota status per service"
```

---

### Task 4: `ServicesList` renders multiple services per day

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/services-list.tsx`

The existing list view shows one service per day. Widen it to show all services in the day's body, stacked.

- [ ] **Step 1: Replace the `.map((day) => ...)` body**

In `src/app/(app)/churches/[churchId]/services/services-list.tsx`, find the `{monthDays.map((day) => {` block and replace the entire row render with a version that loops over `day.services`.

Replace this block (approximately lines 47–135 in the current file — everything inside `{monthDays.map((day) => { ... })}`):

```tsx
            {monthDays.map((day) => {
              const colour = LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? '#4A6741'
              const service = day.services[0] ?? null
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
                      {service && service.choirStatus !== 'CHOIR_REQUIRED' && CHOIR_STATUS_NOTES[service.choirStatus] && (
                        <span className="text-sm italic text-muted-foreground/60 font-normal ml-2">
                          {CHOIR_STATUS_NOTES[service.choirStatus]}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span
                        className="small-caps text-xs px-2 py-0.5 border rounded-sm"
                        style={{ borderColor: colour, color: colour }}
                      >
                        {day.season.replace(/_/g, ' ')}
                      </span>
                      {service && (
                        <span className="text-xs text-muted-foreground">
                          {SERVICE_TYPE_LABELS[service.serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? service.serviceType}
                          {service.time ? ` · ${service.time}` : ''}
                        </span>
                      )}
                      {service && service.musicPreview.length > 0 && (
                        <span className="small-caps text-xs text-muted-foreground/70">
                          {service.musicPreview.length} music
                        </span>
                      )}
                    </div>
                    {service ? (
                      service.musicPreview.length > 0 ? (
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
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No service planned</p>
                    )}
                  </Link>

                  {/* Availability */}
                  {service && (
                    <div
                      className="flex flex-col items-center justify-center gap-1 px-4 border-l border-border flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="small-caps text-xs text-muted-foreground">
                          Availability
                        </span>
                        <AvailabilityWidget
                          serviceId={service.id}
                          churchId={churchId}
                          currentStatus={service.userAvailability}
                          size="md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
```

with the new version (stacks services in the body):

```tsx
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
```

- [ ] **Step 2: Run typecheck + build**

Run: `npm run typecheck && npm run build`

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-list.tsx
git commit -m "feat(services-list): render multiple services per day stacked"
```

---

## Phase 2 — New Calendar

### Task 5: Season ribbon segment computation helper

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/lib/calendar-season-ribbon.ts`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/calendar-season-ribbon.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/(app)/churches/[churchId]/services/__tests__/calendar-season-ribbon.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeSeasonSegments, type RibbonDayInput } from '../lib/calendar-season-ribbon'

function day(date: string, season: RibbonDayInput['season']): RibbonDayInput {
  return { date, season }
}

describe('computeSeasonSegments', () => {
  it('returns an empty array when no days are given', () => {
    expect(computeSeasonSegments([])).toEqual([])
  })

  it('returns a single segment when all days share one season', () => {
    const days = [
      day('2026-07-05', 'ORDINARY'),
      day('2026-07-06', 'ORDINARY'),
      day('2026-07-07', 'ORDINARY'),
    ]
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ORDINARY', days: 3 },
    ])
  })

  it('collapses contiguous runs of the same season into one segment', () => {
    const days = [
      day('2026-11-29', 'ADVENT'),
      day('2026-11-30', 'ADVENT'),
      day('2026-12-01', 'ADVENT'),
      day('2026-12-24', 'ADVENT'),
      day('2026-12-25', 'CHRISTMAS'),
      day('2026-12-26', 'CHRISTMAS'),
    ]
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ADVENT', days: 4 },
      { season: 'CHRISTMAS', days: 2 },
    ])
  })

  it('handles a feast-day interruption by splitting into three segments', () => {
    // Ordinary Time → one-day feast (e.g. All Saints, coloured WHITE which we
    // model here as a separate "season" value) → back to Ordinary Time.
    const days = [
      day('2026-10-31', 'ORDINARY'),
      day('2026-11-01', 'ORDINARY'), // All Saints still counts as ORDINARY for the season field
      day('2026-11-02', 'ORDINARY'),
    ]
    // When the season field doesn't change, we expect a single segment.
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ORDINARY', days: 3 },
    ])
  })

  it('preserves chronological order from the input', () => {
    const days = [
      day('2026-02-15', 'ORDINARY'),
      day('2026-02-16', 'ORDINARY'),
      day('2026-02-17', 'ORDINARY'),
      day('2026-02-18', 'LENT'),
      day('2026-02-19', 'LENT'),
    ]
    const segments = computeSeasonSegments(days)
    expect(segments.map((s) => s.season)).toEqual(['ORDINARY', 'LENT'])
    expect(segments[0].days + segments[1].days).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- calendar-season-ribbon`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/app/(app)/churches/[churchId]/services/lib/calendar-season-ribbon.ts`:

```typescript
import type { LiturgicalSeason } from '@/types'

export interface RibbonDayInput {
  date: string
  season: LiturgicalSeason
}

export interface SeasonSegment {
  season: LiturgicalSeason
  days: number
}

/**
 * Collapses an ordered list of liturgical days into a list of proportional
 * season segments. Contiguous days with the same season become one segment.
 *
 * Input is assumed to already be in chronological order.
 */
export function computeSeasonSegments(days: RibbonDayInput[]): SeasonSegment[] {
  if (days.length === 0) return []

  const segments: SeasonSegment[] = []
  let current: SeasonSegment = { season: days[0].season, days: 1 }

  for (let i = 1; i < days.length; i++) {
    const d = days[i]
    if (d.season === current.season) {
      current.days += 1
    } else {
      segments.push(current)
      current = { season: d.season, days: 1 }
    }
  }
  segments.push(current)
  return segments
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- calendar-season-ribbon`

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/lib/calendar-season-ribbon.ts src/app/\(app\)/churches/\[churchId\]/services/__tests__/calendar-season-ribbon.test.ts
git commit -m "feat(services): add season ribbon segment helper"
```

---

### Task 6: Visible-month-days selector test + helper

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/services-calendar.tsx` (add + export a helper)
- Modify: `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar.test.ts`

The new calendar needs to filter `LiturgicalDayWithService[]` down to those that appear in the visible month's 6-row grid, including outside-month days. We add this helper alongside the existing `buildMonthGrid` and test it.

- [ ] **Step 1: Add the failing test**

In `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar.test.ts`, append a new `describe` block at the bottom of the file:

```typescript
import { pickDaysForGrid } from '../services-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'

function day(date: string): LiturgicalDayWithService {
  return {
    id: `id-${date}`,
    date,
    cwName: 'Test Day',
    season: 'ORDINARY',
    colour: 'GREEN',
    collect: null,
    services: [],
  }
}

describe('pickDaysForGrid', () => {
  it('returns only days whose date string is present in the grid', () => {
    const all = [
      day('2026-04-01'),
      day('2026-04-05'),
      day('2026-04-30'),
      day('2026-05-01'), // outside April grid (falls on Friday 1 May)
    ]
    const picked = pickDaysForGrid(all, 2026, 3) // April
    const dates = picked.map((d) => d.date)
    expect(dates).toContain('2026-04-01')
    expect(dates).toContain('2026-04-05')
    expect(dates).toContain('2026-04-30')
    // 1 May 2026 falls on a Friday — outside April's 6-row grid
    expect(dates).not.toContain('2026-05-01')
  })

  it('includes days from the previous month that appear in the grid', () => {
    // April 2026 grid starts Wed Apr 1, so Mon Mar 30 and Tue Mar 31 are outside days
    const all = [day('2026-03-30'), day('2026-03-31'), day('2026-04-01')]
    const picked = pickDaysForGrid(all, 2026, 3)
    expect(picked.map((d) => d.date).sort()).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
    ])
  })

  it('returns an empty array when no input days intersect the grid', () => {
    const all = [day('2027-01-01')]
    expect(pickDaysForGrid(all, 2026, 3)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- services-calendar`

Expected: FAIL — `pickDaysForGrid is not exported`.

- [ ] **Step 3: Add the helper**

At the bottom of `src/app/(app)/churches/[churchId]/services/services-calendar.tsx`, add a new exported function just above the component (and keep `buildMonthGrid` where it is):

```typescript
import type { LiturgicalDayWithService } from '@/types/service-views'

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
  const visible = new Set(grid.filter((d): d is string => d !== null))
  return days.filter((d) => visible.has(d.date))
}
```

(The `import type` line may already exist — if so, don't duplicate it.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- services-calendar`

Expected: PASS — existing `buildMonthGrid` tests + 3 new `pickDaysForGrid` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar.test.ts
git commit -m "feat(services-calendar): add pickDaysForGrid helper"
```

---

### Task 7: `ServicesCalendarSeasonRibbon` component + test

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/services-calendar-season-ribbon.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-season-ribbon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-season-ribbon.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServicesCalendarSeasonRibbon } from '../services-calendar-season-ribbon'
import type { LiturgicalDayWithService } from '@/types/service-views'

function day(date: string, season: LiturgicalDayWithService['season']): LiturgicalDayWithService {
  return { id: date, date, cwName: 'x', season, colour: 'GREEN', collect: null, services: [] }
}

describe('ServicesCalendarSeasonRibbon', () => {
  it('renders nothing when there are no days', () => {
    const { container } = render(<ServicesCalendarSeasonRibbon days={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one segment per contiguous season', () => {
    const days = [
      day('2026-11-01', 'ORDINARY'),
      day('2026-11-15', 'ORDINARY'),
      day('2026-11-29', 'ADVENT'),
    ]
    render(<ServicesCalendarSeasonRibbon days={days} />)
    expect(screen.getByText(/ordinary/i)).toBeInTheDocument()
    expect(screen.getByText(/advent/i)).toBeInTheDocument()
  })

  it('is marked aria-hidden because it is decorative', () => {
    const days = [day('2026-11-01', 'ORDINARY')]
    const { container } = render(<ServicesCalendarSeasonRibbon days={days} />)
    const ribbon = container.firstChild as HTMLElement
    expect(ribbon.getAttribute('aria-hidden')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- services-calendar-season-ribbon`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/(app)/churches/[churchId]/services/services-calendar-season-ribbon.tsx`:

```tsx
import type { LiturgicalDayWithService } from '@/types/service-views'
import type { LiturgicalSeason } from '@/types'
import { computeSeasonSegments } from './lib/calendar-season-ribbon'

interface Props {
  days: LiturgicalDayWithService[]
}

const SEASON_LABELS: Record<LiturgicalSeason, string> = {
  ADVENT: 'Advent',
  CHRISTMAS: 'Christmas',
  EPIPHANY: 'Epiphany',
  LENT: 'Lent',
  HOLY_WEEK: 'Holy Week',
  EASTER: 'Easter',
  ASCENSION: 'Ascension',
  PENTECOST: 'Pentecost',
  TRINITY: 'Trinity',
  ORDINARY: 'Ordinary Time',
  KINGDOM: 'Kingdom',
}

const SEASON_BG: Record<LiturgicalSeason, string> = {
  ADVENT: 'var(--color-liturgical-purple)',
  CHRISTMAS: 'var(--color-liturgical-gold)',
  EPIPHANY: 'var(--color-liturgical-white)',
  LENT: 'var(--color-liturgical-purple)',
  HOLY_WEEK: 'var(--color-liturgical-red)',
  EASTER: 'var(--color-liturgical-gold)',
  ASCENSION: 'var(--color-liturgical-gold)',
  PENTECOST: 'var(--color-liturgical-red)',
  TRINITY: 'var(--color-liturgical-green)',
  ORDINARY: 'var(--color-liturgical-green)',
  KINGDOM: 'var(--color-liturgical-red)',
}

const LIGHT_SEASONS: ReadonlySet<LiturgicalSeason> = new Set(['EPIPHANY', 'CHRISTMAS'])

export function ServicesCalendarSeasonRibbon({ days }: Props) {
  const segments = computeSeasonSegments(days)
  if (segments.length === 0) return null

  return (
    <div
      aria-hidden="true"
      className="flex w-full overflow-hidden rounded-sm border border-border my-3"
      style={{ height: '22px' }}
    >
      {segments.map((seg, i) => {
        const bg = SEASON_BG[seg.season]
        const light = LIGHT_SEASONS.has(seg.season)
        return (
          <div
            key={`${seg.season}-${i}`}
            className="flex items-center justify-center overflow-hidden px-2 small-caps text-[10px] whitespace-nowrap"
            style={{
              flex: seg.days,
              background: bg,
              color: light ? 'var(--foreground)' : '#fff',
            }}
          >
            {seg.days >= 3 ? SEASON_LABELS[seg.season] : ''}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- services-calendar-season-ribbon`

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar-season-ribbon.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar-season-ribbon.test.tsx
git commit -m "feat(services-calendar): add season ribbon component"
```

---

### Task 8: `ServicesCalendarMonthPicker` component + test

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/services-calendar-month-picker.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-month-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-month-picker.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ServicesCalendarMonthPicker } from '../services-calendar-month-picker'

describe('ServicesCalendarMonthPicker', () => {
  it('renders the starting year in the header', () => {
    render(
      <ServicesCalendarMonthPicker
        year={2026}
        month={3}
        onSelect={() => {}}
      />
    )
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('renders all twelve month buttons', () => {
    render(
      <ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />
    )
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    for (const m of months) {
      expect(screen.getByRole('button', { name: m })).toBeInTheDocument()
    }
  })

  it('marks the current month as aria-pressed', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    const april = screen.getByRole('button', { name: 'Apr' })
    expect(april.getAttribute('aria-pressed')).toBe('true')
    const may = screen.getByRole('button', { name: 'May' })
    expect(may.getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onSelect with year and month when a month is clicked', () => {
    const onSelect = vi.fn()
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jul' }))
    expect(onSelect).toHaveBeenCalledWith(2026, 6)
  })

  it('advances the displayed year when the forward stepper is clicked', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /next year/i }))
    expect(screen.getByText('2027')).toBeInTheDocument()
  })

  it('goes back when the previous year stepper is clicked', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /previous year/i }))
    expect(screen.getByText('2025')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- services-calendar-month-picker`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/(app)/churches/[churchId]/services/services-calendar-month-picker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  year: number
  month: number
  onSelect: (year: number, month: number) => void
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function ServicesCalendarMonthPicker({ year, month, onSelect }: Props) {
  const [displayYear, setDisplayYear] = useState(year)

  return (
    <div className="w-56">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous year"
          onClick={() => setDisplayYear((y) => y - 1)}
          className="p-1 hover:bg-muted transition-colors rounded-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <span className="small-caps text-sm font-semibold">{displayYear}</span>
        <button
          type="button"
          aria-label="Next year"
          onClick={() => setDisplayYear((y) => y + 1)}
          className="p-1 hover:bg-muted transition-colors rounded-sm"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTH_LABELS.map((label, idx) => {
          const isCurrent = displayYear === year && idx === month
          return (
            <button
              key={label}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onSelect(displayYear, idx)}
              className={cn(
                'small-caps text-xs py-2 rounded-sm border transition-colors',
                isCurrent
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent hover:bg-muted'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- services-calendar-month-picker`

Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar-month-picker.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar-month-picker.test.tsx
git commit -m "feat(services-calendar): add month picker component"
```

---

### Task 9: `ServicesCalendarHeader` component + test

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/services-calendar-header.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-header.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ServicesCalendarHeader } from '../services-calendar-header'

describe('ServicesCalendarHeader', () => {
  it('renders the month and year title', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10} // November
        serviceCount={5}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/November 2026/)).toBeInTheDocument()
  })

  it('renders the service count in the header', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={12}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/12 services/)).toBeInTheDocument()
  })

  it('pluralises service count correctly when there is exactly one service', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={1}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/1 service$/)).toBeInTheDocument()
  })

  it('calls onPrev when the previous month button is clicked', () => {
    const onPrev = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={onPrev}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(onPrev).toHaveBeenCalledOnce()
  })

  it('calls onNext when the next month button is clicked', () => {
    const onNext = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={onNext}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('disables the Today button when isCurrentMonth is true', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={true}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    const today = screen.getByRole('button', { name: /today/i })
    expect(today).toBeDisabled()
  })

  it('calls onToday when the Today button is clicked', () => {
    const onToday = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={onToday}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /today/i }))
    expect(onToday).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- services-calendar-header`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/(app)/churches/[churchId]/services/services-calendar-header.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ServicesCalendarMonthPicker } from './services-calendar-month-picker'

interface Props {
  year: number
  month: number
  serviceCount: number
  isCurrentMonth: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectMonth: (year: number, month: number) => void
}

export function ServicesCalendarHeader({
  year,
  month,
  serviceCount,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
  onSelectMonth,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const title = format(new Date(year, month, 1), 'MMMM yyyy')
  const countLabel = `${serviceCount} ${serviceCount === 1 ? 'service' : 'services'}`

  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger className="inline-flex items-center gap-1 rounded-sm px-2 py-1 font-heading text-xl font-semibold hover:bg-muted transition-colors">
            {title}
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </PopoverTrigger>
          <PopoverContent align="start">
            <ServicesCalendarMonthPicker
              year={year}
              month={month}
              onSelect={(y, m) => {
                onSelectMonth(y, m)
                setPickerOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>

        <span className="small-caps text-xs text-muted-foreground ml-2">
          {countLabel}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isCurrentMonth}
        onClick={onToday}
      >
        Today
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- services-calendar-header`

Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar-header.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar-header.test.tsx
git commit -m "feat(services-calendar): add header with month picker and Today button"
```

---

### Task 10: `ServicesCalendarCell` component + tests

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/services-calendar-cell.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-cell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar-cell.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServicesCalendarCell } from '../services-calendar-cell'
import type { LiturgicalDayWithService, ServiceSummary } from '@/types/service-views'

function makeService(overrides: Partial<ServiceSummary> = {}): ServiceSummary {
  return {
    id: 's1',
    serviceType: 'SUNG_EUCHARIST',
    time: '10:00',
    status: 'DRAFT',
    choirStatus: 'CHOIR_REQUIRED',
    userAvailability: null,
    musicPreview: [],
    musicStatus: 'empty',
    rotaStatus: 'empty',
    ...overrides,
  }
}

function makeDay(
  overrides: Partial<LiturgicalDayWithService> = {}
): LiturgicalDayWithService {
  return {
    id: 'd1',
    date: '2026-11-15',
    cwName: 'Trinity 23',
    season: 'ORDINARY',
    colour: 'GREEN',
    collect: null,
    services: [],
    ...overrides,
  }
}

describe('ServicesCalendarCell — outside month', () => {
  it('renders only the day number when outside the visible month', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ date: '2026-10-26' })}
        dateStr="2026-10-26"
        isOutsideMonth={true}
        isSunday={false}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('26')).toBeInTheDocument()
    expect(screen.queryByText(/Trinity/)).not.toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — empty day', () => {
  it('renders the day number and nothing else when no services', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={null}
        dateStr="2026-11-04"
        isOutsideMonth={false}
        isSunday={false}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders today with an accessible Today marker', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={null}
        dateStr="2026-11-11"
        isOutsideMonth={false}
        isSunday={false}
        isToday={true}
        role="MEMBER"
      />
    )
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText(/^Today$/i)).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — weekday feast', () => {
  it('renders the feast name even without a service', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ date: '2026-11-02', cwName: 'All Souls', services: [] })}
        dateStr="2026-11-02"
        isOutsideMonth={false}
        isSunday={false}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('All Souls')).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — editor with one service', () => {
  it('renders the service title, time, and music count', () => {
    const day = makeDay({
      services: [
        makeService({
          time: '10:00',
          musicPreview: [
            { id: 'm1', slotType: 'HYMN', positionOrder: 1, title: 'Praise my soul' },
            { id: 'm2', slotType: 'HYMN', positionOrder: 2, title: 'Guide me' },
          ],
          musicStatus: 'partial',
          rotaStatus: 'ready',
        }),
      ],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('Sung Eucharist')).toBeInTheDocument()
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
    expect(screen.getByText('Praise my soul')).toBeInTheDocument()
    expect(screen.getByText('Guide me')).toBeInTheDocument()
  })

  it('links the service card to the service detail page', () => {
    const day = makeDay({ services: [makeService()] })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    const link = screen.getByRole('link', { name: /Sung Eucharist/ })
    expect(link).toHaveAttribute('href', '/churches/c1/services/2026-11-15')
  })

  it('shows "+ Plan service" affordance on an empty Sunday for editors', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ services: [] })}
        dateStr="2026-11-15"
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    const plan = screen.getByRole('link', { name: /plan service/i })
    expect(plan).toHaveAttribute('href', '/churches/c1/services/2026-11-15?mode=edit')
  })

  it('does NOT show "+ Plan service" affordance for members', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ services: [] })}
        dateStr="2026-11-15"
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.queryByRole('link', { name: /plan service/i })).toBeNull()
  })
})

describe('ServicesCalendarCell — multiple services', () => {
  it('renders up to 2 services in full and collapses the rest to a "+ N more" link', () => {
    const day = makeDay({
      services: [
        makeService({ id: 's1', serviceType: 'SUNG_EUCHARIST', time: '08:00' }),
        makeService({ id: 's2', serviceType: 'CHORAL_EVENSONG', time: '18:30' }),
        makeService({ id: 's3', serviceType: 'COMPLINE', time: '21:00' }),
      ],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('Sung Eucharist')).toBeInTheDocument()
    expect(screen.getByText('Choral Evensong')).toBeInTheDocument()
    expect(screen.queryByText('Compline')).toBeNull()
    expect(screen.getByText('+ 1 more')).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — member availability', () => {
  it('shows the member availability state when set', () => {
    const day = makeDay({
      services: [makeService({ userAvailability: 'AVAILABLE' })],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText(/available/i)).toBeInTheDocument()
  })

  it('shows "not set" when member availability is null', () => {
    const day = makeDay({
      services: [makeService({ userAvailability: null })],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText(/not set/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- services-calendar-cell`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/(app)/churches/[churchId]/services/services-calendar-cell.tsx`:

```tsx
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

  // Outside-month: day number only, dimmed, non-interactive
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- services-calendar-cell`

Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar-cell.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar-cell.test.tsx
git commit -m "feat(services-calendar): add role-adaptive day cell component"
```

---

### Task 11: Compose the new `ServicesCalendar`

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/services-calendar.tsx`

Replace the old calendar body with a composition of the new header + ribbon + cell grid. Keep the existing `buildMonthGrid` and `pickDaysForGrid` exports (tests depend on them).

- [ ] **Step 1: Replace the file**

Overwrite `src/app/(app)/churches/[churchId]/services/services-calendar.tsx` entirely:

```tsx
'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { MemberRole } from '@/types'
import type { LiturgicalDayWithService } from '@/types/service-views'
import { ServicesCalendarHeader } from './services-calendar-header'
import { ServicesCalendarSeasonRibbon } from './services-calendar-season-ribbon'
import { ServicesCalendarCell } from './services-calendar-cell'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Builds an array of date strings ("YYYY-MM-DD") or nulls for a Mon–Sun month grid. */
export function buildMonthGrid(year: number, month: number): Array<string | null> {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isoFirst = (firstDay.getDay() + 6) % 7 // Mon=0 … Sun=6

  const cells: Array<string | null> = []
  // Outside-month days from the previous month
  if (isoFirst > 0) {
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = isoFirst - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      cells.push(format(new Date(prevYear, prevMonth, d), 'yyyy-MM-dd'))
    }
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'))
  }
  // Outside-month days from the next month to fill to 6 full rows (42 cells)
  let dayOfNext = 1
  while (cells.length < 42) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
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
  const visible = new Set(grid.filter((d): d is string => d !== null))
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
    // Only count services on days in the current (non-outside) month
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

        {grid.map((dateStr, idx) => {
          if (dateStr === null) {
            return (
              <div
                key={`null-${idx}`}
                className="border-r border-b border-border min-h-[150px] bg-muted opacity-40"
              />
            )
          }
          const cellDate = new Date(dateStr)
          const isOutsideMonth = cellDate.getMonth() !== month || cellDate.getFullYear() !== year
          const isSunday = (cellDate.getDay() + 6) % 7 === 6
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
```

- [ ] **Step 2: Update the existing `buildMonthGrid` tests to match the new output**

The new `buildMonthGrid` fills in outside-month days instead of leaving nulls. The existing tests expected `null` in those positions and need updating. Open `src/app/(app)/churches/[churchId]/services/__tests__/services-calendar.test.ts` and replace the top `describe` block:

Replace:
```typescript
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
```

with:

```typescript
describe('buildMonthGrid', () => {
  it('April 2026 starts Wednesday — prev-month fills Mon/Tue slots', () => {
    const grid = buildMonthGrid(2026, 3) // month=3 is April (0-indexed)
    expect(grid[0]).toBe('2026-03-30')   // Mon col: outside-month (March 30)
    expect(grid[1]).toBe('2026-03-31')   // Tue col: outside-month (March 31)
    expect(grid[2]).toBe('2026-04-01')   // Wed col: April 1
    expect(grid[6]).toBe('2026-04-05')   // Sun col: first Sunday (Palm Sunday)
  })

  it('always produces exactly 42 cells (6 rows × 7 cols)', () => {
    for (let m = 0; m < 12; m++) {
      expect(buildMonthGrid(2026, m).length).toBe(42)
    }
  })

  it('January 2026 starts Thursday — prev-month fills Mon/Tue/Wed', () => {
    const grid = buildMonthGrid(2026, 0)
    expect(grid[0]).toBe('2025-12-29')   // Mon
    expect(grid[1]).toBe('2025-12-30')   // Tue
    expect(grid[2]).toBe('2025-12-31')   // Wed
    expect(grid[3]).toBe('2026-01-01')   // Thu
  })

  it('contains the correct number of in-month days', () => {
    const april = buildMonthGrid(2026, 3).filter((d) => d?.startsWith('2026-04-'))
    expect(april).toHaveLength(30)
    const feb = buildMonthGrid(2026, 1).filter((d) => d?.startsWith('2026-02-'))
    expect(feb).toHaveLength(28)
  })
})
```

- [ ] **Step 3: Also update the `pickDaysForGrid` test for the new outside-days contract**

In the same file, the existing `pickDaysForGrid` test from Task 6 assumed the grid had only in-month days. The new grid includes outside-month days. Replace the first test of the `pickDaysForGrid` describe block:

Replace:
```typescript
  it('returns only days whose date string is present in the grid', () => {
    const all = [
      day('2026-04-01'),
      day('2026-04-05'),
      day('2026-04-30'),
      day('2026-05-01'), // outside April grid (falls on Friday 1 May)
    ]
    const picked = pickDaysForGrid(all, 2026, 3) // April
    const dates = picked.map((d) => d.date)
    expect(dates).toContain('2026-04-01')
    expect(dates).toContain('2026-04-05')
    expect(dates).toContain('2026-04-30')
    // 1 May 2026 falls on a Friday — outside April's 6-row grid
    expect(dates).not.toContain('2026-05-01')
  })
```

with:
```typescript
  it('returns only days whose date string is present in the grid', () => {
    const all = [
      day('2026-04-01'),
      day('2026-04-05'),
      day('2026-04-30'),
      day('2026-05-01'), // 1 May 2026 is a Friday — IS in April's grid as an outside-month day
      day('2026-06-15'), // definitely outside
    ]
    const picked = pickDaysForGrid(all, 2026, 3) // April
    const dates = picked.map((d) => d.date)
    expect(dates).toContain('2026-04-01')
    expect(dates).toContain('2026-04-05')
    expect(dates).toContain('2026-04-30')
    expect(dates).toContain('2026-05-01')  // outside-month day, included
    expect(dates).not.toContain('2026-06-15')
  })
```

- [ ] **Step 4: Run tests**

Run: `npm test -- services-calendar`

Expected: PASS — all existing + updated tests green.

- [ ] **Step 5: Run typecheck + build**

Run: `npm run typecheck && npm run build`

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-calendar.tsx src/app/\(app\)/churches/\[churchId\]/services/__tests__/services-calendar.test.ts
git commit -m "feat(services-calendar): compose new calendar with header, ribbon, and cells"
```

---

### Task 12: `ServicesViewWrapper` accepts `role` + mobile fallback

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/services-view-wrapper.tsx`

- [ ] **Step 1: Update the wrapper**

Replace `src/app/(app)/churches/[churchId]/services/services-view-wrapper.tsx` entirely:

```tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ServicesList } from './services-list'
import { ServicesCalendar } from './services-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'
import type { MemberRole } from '@/types'

type ViewMode = 'list' | 'calendar'

interface ServicesViewWrapperProps {
  churchId: string
  liturgicalDays: LiturgicalDayWithService[]
  role: MemberRole
}

const LS_KEY = 'precentor:services-view'
const VALID_VIEWS: ViewMode[] = ['list', 'calendar']
const DESKTOP_MIN_WIDTH = 768 // matches Tailwind's `md` breakpoint

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= DESKTOP_MIN_WIDTH
  })
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    setIsDesktop(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export function ServicesViewWrapper({
  churchId,
  liturgicalDays,
  role,
}: ServicesViewWrapperProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isDesktop = useIsDesktop()

  const urlView = searchParams.get('view') as ViewMode | null
  const isValidUrl = urlView && VALID_VIEWS.includes(urlView)

  let view: ViewMode = 'list'
  if (isValidUrl) {
    view = urlView
  } else if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_KEY) as ViewMode | null
    if (stored && VALID_VIEWS.includes(stored)) view = stored
  }

  // Mobile fallback: force list view regardless of URL/localStorage preference
  if (!isDesktop) {
    view = 'list'
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
        <h1 className="text-3xl font-heading font-semibold">Upcoming Services</h1>
        {isDesktop && (
          <div className="flex border border-border overflow-hidden rounded-sm">
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
        )}
      </div>

      {view === 'list' && <ServicesList churchId={churchId} days={liturgicalDays} />}
      {view === 'calendar' && (
        <ServicesCalendar churchId={churchId} days={liturgicalDays} role={role} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: FAIL — `services/page.tsx` doesn't pass `role` yet. Good — that's Task 13.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/services-view-wrapper.tsx
git commit -m "feat(services): view wrapper accepts role and forces list on mobile"
```

---

### Task 13: `services/page.tsx` passes `role` through

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx`

- [ ] **Step 1: Destructure `membership` and pass `role`**

In `src/app/(app)/churches/[churchId]/services/page.tsx`, find the `requireChurchRole` call:

```typescript
  const { user, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
```

Replace with:

```typescript
  const { user, membership, error } = await requireChurchRole(churchId, 'MEMBER')
  if (error) redirect('/login')

  const userId = user!.id
  const role = (membership!.role as import('@/types').MemberRole)
```

Then find the `<ServicesViewWrapper ...>` JSX at the bottom of the file:

```typescript
        <ServicesViewWrapper
          churchId={churchId}
          liturgicalDays={days}
        />
```

Replace with:

```typescript
        <ServicesViewWrapper
          churchId={churchId}
          liturgicalDays={days}
          role={role}
        />
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run the full suite**

Run: `npm run build && npm test`

Expected: build + all 401+ tests green.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/page.tsx
git commit -m "feat(services): pass role into ServicesViewWrapper"
```

---

## Phase 3 — Final Verification

### Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no warnings).

- [ ] **Step 3: Unit + rendering tests**

Run: `npm test`
Expected: all tests green. Should include roughly 35+ new tests across `service-status`, `calendar-season-ribbon`, `services-calendar-season-ribbon`, `services-calendar-month-picker`, `services-calendar-header`, `services-calendar-cell`, and the updated `services-calendar` test file.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: clean build, no new warnings.

- [ ] **Step 5: Manual desktop smoke test**

Start the dev server (`npm run dev`), sign in as an ADMIN or EDITOR user for a test church, navigate to `/churches/<id>/services`, toggle to "calendar". Verify:
- Header shows current month + year + "N services" + Today button (disabled on current month).
- Season ribbon visible between header and grid.
- Grid shows 6 rows × 7 columns. Sundays in brown.
- Today wrapped in a filled circle.
- Clicking a service card navigates to the service detail page.
- Clicking prev/next advances one month; click Today returns.
- Click month title → popover with year stepper + 12-month grid; click April → jumps.
- Empty Sunday shows a dashed "+ Plan service" link (editor only).

- [ ] **Step 6: Manual member smoke test**

Sign in as a MEMBER (create a second test user if needed). Navigate to the calendar view. Verify:
- No "+ Plan service" affordance.
- Each service card shows an availability icon + label (`available` / `unavailable` / `tentative` / `not set`).
- Status dots are NOT shown in member cells.

- [ ] **Step 7: Manual mobile fallback test**

Open Chrome DevTools, switch to a 375px viewport. Navigate to `/churches/<id>/services?view=calendar`. Verify:
- The view renders as the list view, not the calendar.
- The list/calendar toggle is NOT visible.
- Scrolling and interactions work normally.

- [ ] **Step 8: Final commit (if any small fixes were needed)**

If manual QA surfaces any small fixes, commit them with a descriptive message. Otherwise skip this step.

- [ ] **Step 9: Summary message**

Report back:
- Total commits in this plan (should be approximately 12–13).
- Count of new tests added.
- Any manual-QA issues that needed follow-up fixes.
- Confirmation that `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` all pass.

---

## Notes for the Engineer

**Why we widened `LiturgicalDayWithService.service` → `services`:** the DB schema has always supported multiple services per liturgical day (e.g. morning Eucharist + evening Evensong on the same Sunday), but the existing code silently dropped secondary services. The calendar surfaces this, so the type now reflects reality across the whole services layer. The `ServicesList` was updated to stack them too — that's an intentional improvement, not scope creep.

**Why `musicStatus` / `rotaStatus` are computed server-side:** the calendar cell should never need to re-query. All aggregation happens once in `services/page.tsx` and flows as plain data. Keep this pattern if adding more signals in the future.

**Why the mobile fallback uses a `useIsDesktop` hook:** we need client-side awareness of viewport size because `localStorage` and URL params can ask for the calendar view, but on mobile we should ignore them. CSS-only `md:hidden` won't do this because the calendar would still render and break layout on small screens. The hook is simple and matches Tailwind's breakpoint.

**Why the popover is native (not Radix):** the existing `Popover` primitive in the codebase is a minimal click-outside-to-close implementation. It lacks focus-trap and keyboard-escape, but the calendar's month picker is low-stakes (opening/closing doesn't affect data) so this is acceptable for v1. If we add more popovers elsewhere, consider upgrading to Radix.

**Why no keyboard shortcuts:** deliberately out of scope per the spec. Native tab order through the buttons + service card links gives full keyboard navigability already.

**Potential gotcha with `buildMonthGrid`:** the rewrite in Task 11 changes the contract — it now returns **42 cells always** (6 rows × 7 columns), with outside-month days filled in. The old version returned variable lengths with `null` padding. Task 11 updates the existing tests to match. If you see a test failure in `services-calendar.test.ts` after Task 11, it's because the old assertions about `null` values no longer apply.
