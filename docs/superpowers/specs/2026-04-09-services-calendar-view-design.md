# Services Calendar View — Design

**Date:** 2026-04-09
**Status:** Approved, ready for implementation plan
**Scope:** Replace the existing services calendar view with a refined, desktop-only month grid that supplements the list view.

---

## Context

Precentor has two service views today: a list (default) and a calendar, toggled inside `ServicesViewWrapper`. The list view is well-designed and already handles mobile. The existing calendar (`services-calendar.tsx`) is functional but unpolished — cramped cells, mono-font labels, no liturgical season context, no way to jump to a specific month, and a weak interaction model. This spec replaces it with a proper calendar that feels at home in Precentor's prayer-book aesthetic.

The refined calendar is **a supplement, not a replacement** — the list view stays as the default. The calendar's job is to let Directors of Music and choir members see the shape of a month at a glance: which Sundays are planned, which are missing music, what liturgical seasons span the month, and where today sits in all of that. It is **desktop-only**. On viewports below `md` (768px), the view wrapper silently falls back to the list view regardless of URL/localStorage preference.

---

## Design Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Primary audience | Both members and editors (role-adaptive cell content) |
| Calendar shape | Traditional 7-column Mon–Sun month grid |
| Scope | Desktop-only (`md+`); mobile falls back to list view |
| Role relative to list view | Supplement — list view remains default |
| Cell density | Dense (~150px rows), showing service card + up to 2 music previews |
| Click action | Navigate to service detail page |
| Header chrome | Today button + month/year picker dropdown |
| Season context | Proportional season ribbon above the grid |
| Keyboard shortcuts | Not in this iteration |
| Service-type filter | Not in this iteration |
| Hover previews / side panels / context menus | Not in this iteration |

---

## Architecture

### Data flow

The calendar is purely presentational. All data is fetched server-side in `services/page.tsx` and passed through `ServicesViewWrapper` → `ServicesCalendar` as props. The calendar owns only two pieces of state: the visible `year` and `month`. Month navigation is **client-side over the pre-fetched array** — there is no re-fetching when the user clicks prev/next.

```
services/page.tsx (server)                           ← fetches liturgicalDays
  └── ServicesViewWrapper (client)                   ← owns view toggle, passes role
        ├── ServicesList                             ← existing list view (modified: handles multiple services per day)
        └── ServicesCalendar                         ← new implementation
              ├── ServicesCalendarHeader             ← prev/next, title, Today
              │     └── ServicesCalendarMonthPicker  ← popover with year stepper + month grid
              ├── ServicesCalendarSeasonRibbon       ← proportional season bands
              └── ServicesCalendarCell[]             ← role-adaptive day cells
```

### Data model changes

`LiturgicalDayWithService` currently has `service: ServiceSummary | null` (singular). The underlying schema allows multiple services per day, and the existing `ServicesList` silently drops secondary services. The calendar makes this visible, so we fix it at the source:

- `src/types/service-views.ts` — change `service: ServiceSummary | null` → `services: ServiceSummary[]`.
- `services/page.tsx` — widen the query to fetch all services per liturgical day.
- `services-list.tsx` — render all services per day (stacked).
- Both calendar cell variants handle 0, 1, or N services per day (stack up to 2, then `+ N more`).

### Responsive behaviour

`ServicesViewWrapper` currently shows a view toggle and respects `?view=calendar`. Changes:

- Below `md` (768px), the toggle button is hidden and the calendar view is force-disabled regardless of URL or localStorage preference. The list view always renders.
- At `md+`, behaviour is unchanged.
- The calendar itself does **not** attempt to be responsive below `md`. It's designed for desktop and relies on sufficient horizontal space for a 7-column grid with 150px-tall cells.

---

## Visual Design

### Grid shell

- **Layout:** 7-column Mon–Sun grid, always 6 structural rows (some rows may be entirely outside-month, e.g. Feb has 4–5 populated rows). Outside-month days are shown dimmed (`bg-muted opacity-40`) rather than hidden, keeping the grid shape stable across months.
- **Row height:** each row uses `min-content` so rows grow to fit the tallest cell in that row. Minimum row height is ~150px (enforced by `min-h-[150px]` on cells). A row containing a cell with 2+ stacked services grows taller. This means the grid's total height varies slightly month-to-month — accepted as a tradeoff for readable dense cells.
- **Borders:** 1px `border-border` on all sides of each cell, warm cream cell backgrounds.
- **Column headers:** small-caps `text-xs` Mon Tue Wed Thu Fri Sat Sun. Sunday column header in `text-primary` to distinguish.
- **Cells:** `min-h-[150px]`, `padding: 6px 7px`. Grow vertically to fit if a cell has multiple stacked services; the whole row grows with them.

### Header (above grid)

```
┌────────────────────────────────────────────────────────────┐
│  ← November 2026 ▾    12 services                [Today]  │
└────────────────────────────────────────────────────────────┘
```

- **Prev/next arrows:** `ChevronLeft`/`ChevronRight` icon buttons with `strokeWidth={1.5}`, wrapped in `Button variant="outline" size="icon"`.
- **Month title:** clickable button with `font-heading text-xl font-semibold` and a small chevron-down icon indicating it opens a picker. Opens the month picker popover on click.
- **Service count:** small-caps `text-xs text-muted-foreground`, to the right of the title. Reads "N services" (0 shown as "0 services", no special empty state).
- **Today button:** `Button variant="outline" size="sm"`, far right. Disabled when the current month is already displayed.

### Month/year picker popover

Uses the existing `Popover` primitive.

- **Header:** `← 2026 →` year stepper in small-caps.
- **Body:** 3 × 4 grid of month buttons. Current month highlighted with `border-primary`. Clicking a month closes the popover and jumps.
- **Width:** ~240px.
- **Keyboard:** tab through, enter to select, escape to close (inherits from Popover).

### Season ribbon (between header and grid)

A thin band (~22px tall) spanning the full grid width, made of proportional flex segments — one per liturgical season touching the visible month.

- Each segment's `flex` value = number of days in that season within the visible month grid (including outside-month days, to match grid width).
- Fill uses the existing `--color-liturgical-*` tokens.
- Label in small-caps, reversed-out (white on coloured background), centred. Label is hidden if the segment is too narrow to fit (e.g. a 1-day feast between two long seasons).
- Example: Nov 2026 reads `[Ordinary Time ──── All Saints ── Ordinary Time ─ Advent]`.
- Purely decorative/informational. Not interactive in this iteration.

### Day cell contents

Every cell uses this skeleton:

```
┌───────────────┐
│ 15            │  ← day number, oldstyle figures, text-muted-foreground
│ Trinity 23    │  ← feast/liturgical day name, italic xs muted
│ ┌───────────┐ │
│ │▍Sung Euch.│ │  ← service card with 3px left colour bar
│ │ 10·00·3 ♩ │ │  ← meta: small-caps text-[10px]
│ │ Praise my │ │  ← music preview: italic text-[10px] muted
│ │ Guide me  │ │
│ └───────────┘ │
└───────────────┘
```

**Non-Sunday weekdays:** day number only. Exception: if `liturgicalDay.cwName` identifies a named feast (Ash Wednesday, Candlemas, Ascension Day, etc.), render the feast name in italic muted. No service card unless an explicit service exists.

**Sundays and service-bearing days:** day number, optional feast name, then the service card.

**Today indicator:** the day number wraps in a brown-filled circle (22×22px, `rounded-full`, `bg-primary text-primary-foreground`).

**Outside-month days:** `bg-muted opacity-40`, day number only, unclickable. No service card rendered even if a service exists (user navigates to that month to interact).

### Service card

Rendered inside the cell for any day with at least one service. The card has:

- **Left border:** 3px solid, coloured by `LITURGICAL_COLOURS[liturgicalDay.colour]`, fallback `--color-liturgical-green`.
- **Background:** `#fff` (card colour), `border-radius: 2px`, slight `shadow-sm`.
- **Title:** service type label from `SERVICE_TYPE_LABELS`, `font-heading text-[11px] font-semibold leading-tight`.
- **Meta line:** small-caps `text-[10px] text-muted-foreground`. Content varies by role (see below).
- **Music preview:** up to 2 entries from `service.musicPreview`, italic `text-[10px] text-muted-foreground`, each line truncated with `text-ellipsis overflow-hidden whitespace-nowrap`. If more music items exist, no "+ N more" line — the previews are illustrative, not a complete list.
- **Status indicator row:** 1 line, different per role (see below).

### Role adaptation

Role is passed as a `role: MemberRole` prop from `ServicesViewWrapper`. The cell dispatches to one of two service card variants:

**`EditorServiceCard`** (ADMIN / EDITOR):

- Meta line: `10:00 · 3 hymns · 1 anthem` (time, music counts by type)
- Status dots: two 6px circles side-by-side, labelled in small-caps: `● music  ● rota`. Colours map to the existing `--success` / `--warning` / `--destructive` tokens.
- **Music status computation** (precomputed server-side in `services/page.tsx`, stored as `ServiceSummary.musicStatus: 'ready' | 'partial' | 'empty'`):
  - `empty` — no music slots have a resolved hymn, anthem, or freeText.
  - `partial` — some but not all of the service's music slots have content.
  - `ready` — every music slot has content (using the slot count from the service's sections as the denominator).
- **Rota status computation** (precomputed server-side, stored as `ServiceSummary.rotaStatus: 'ready' | 'partial' | 'empty'`):
  - `empty` — no `rotaEntries` exist for this service at all.
  - `partial` — rota entries exist but at least one voice part (SOPRANO / ALTO / TENOR / BASS) has zero confirmed singers.
  - `ready` — every voice part has at least one confirmed rota entry.
- The calendar cell does **not** re-query — it only reads these precomputed fields.

**`MemberServiceCard`** (MEMBER):

- Meta line: `10:00 · white` (time, liturgical colour by name)
- Availability indicator: one line with an icon + small-caps label reflecting the member's current availability for this service:
  - `✓ available` (green check)
  - `✗ unavailable` (red X)
  - `~ tentative` (amber tilde / minus)
  - neutral *"not set"* in muted-fg if `userAvailability` is null
- **No interactive `AvailabilityWidget` in the cell** — too large and tap-active for this density. Members click the card to navigate to the service detail page where the existing widget handles it.

### Multiple services per day

Cells can contain multiple service cards, stacked vertically with a 4px gap. The cell grows to fit (row height expands). Rules:

- Up to **2 stacked service cards** render in full.
- A third+ service collapses to a small `+ N more` link at the bottom of the stack, styled as a muted small-caps button. Clicking it navigates to the service detail page for that date (which already handles multiple services via tabs in the service planner).

### Empty Sundays / liturgical days with no service

- The day number and feast name still render.
- **Editor:** a dashed-border affordance appears where the service card would be, reading `+ Plan service` in small-caps, clickable. Links to `/churches/{churchId}/services/{date}?mode=edit`.
- **Member:** nothing beyond the day name.

---

## Interactions

- **Click any service card** → navigate to `/churches/{churchId}/services/{date}`.
- **Click the "+ Plan service" affordance** (editor only) → navigate to `/churches/{churchId}/services/{date}?mode=edit`.
- **Click prev/next arrow** → change month (client-side, no refetch).
- **Click month title** → open month/year picker popover.
- **Click a month in the picker** → jump to that month, close popover.
- **Click the year stepper** → change year inside the picker, month grid re-renders.
- **Click Today** → jump to the month containing the current date. Disabled when already there.
- **Tab / Shift-Tab** → native focus order through header chrome then grid cells in reading order.
- **Click outside the popover** or **press Escape** → close it (Popover primitive default).
- **No hover state beyond the service card's `hover:border-primary transition-colors`.** No hover popovers.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| No liturgical data for a date | Day number only, no feast name, no styling change. Sunday column colour still distinguishes. |
| No services in the whole visible month | Grid renders normally. Header reads "0 services". No dedicated empty state. |
| Visible month is entirely outside the pre-fetched range | Grid renders day numbers only. No errors. Noted as a known limitation (future: re-fetch). |
| Past Sundays | Rendered identically to future ones. Clicking still navigates to the read view. |
| Liturgical colour missing from the map | Falls back to `--color-liturgical-green`. |
| Service has no music yet | Music preview omitted. Editor's `music` status dot goes red. |
| Member has no availability set | Availability line reads "not set" in muted style. |
| A cell has both a named feast AND a service (e.g. Ash Wednesday) | Feast name renders above the service card, as normal. |
| Today is an outside-month day | Today circle still renders (user is viewing a different month but the "today" styling still applies). |
| Three+ services on one day | First 2 render in full, third+ collapse to "+ N more". |

---

## File Plan

### New files

| File | Purpose | Size |
|---|---|---|
| `src/app/(app)/churches/[churchId]/services/services-calendar-header.tsx` | Prev/next, title, month picker trigger, service count, Today button | ~80 lines |
| `src/app/(app)/churches/[churchId]/services/services-calendar-month-picker.tsx` | Popover content: year stepper + 12-month grid | ~60 lines |
| `src/app/(app)/churches/[churchId]/services/services-calendar-season-ribbon.tsx` | Proportional season band computation + rendering | ~40 lines |
| `src/app/(app)/churches/[churchId]/services/services-calendar-cell.tsx` | Day cell; dispatches to EditorServiceCard / MemberServiceCard | ~120 lines |

### Modified files

| File | Change |
|---|---|
| `src/app/(app)/churches/[churchId]/services/services-calendar.tsx` | Rewritten. Owns `year`/`month` state. Composes header + ribbon + grid of cells. ~180 lines. |
| `src/app/(app)/churches/[churchId]/services/services-view-wrapper.tsx` | Hide toggle below `md`, force list view below `md`, accept and pass `role` prop. ~10 lines changed. |
| `src/app/(app)/churches/[churchId]/services/page.tsx` | Pass `role`. Widen query to fetch all services per day. Precompute `musicStatus` and `rotaStatus` per service. ~20 lines changed. |
| `src/types/service-views.ts` | `service: ServiceSummary \| null` → `services: ServiceSummary[]`. Add `musicStatus` and `rotaStatus` to `ServiceSummary`. |
| `src/app/(app)/churches/[churchId]/services/services-list.tsx` | Handle multiple services per day (stacked within the existing list row). Use `services[0]` metadata for the date row. |

### Unchanged

- All shadcn-style primitives (`Button`, `Popover`, `Card`, etc.).
- Design tokens (`--color-liturgical-*`, `--primary`, etc.).
- Routing, data fetching layer, API routes.
- All other service-related pages (service detail, service planner, etc.).

---

## Testing

### Unit tests (new)

- `buildMonthGrid(year, month)` — keep existing tests, verify no regression.
- Season-ribbon segment computation: given a `LiturgicalDayWithService[]` covering a visible month, produces an ordered `{season, days}[]` matching the grid.
- "Visible month days" selector: given full `liturgicalDays` and a target year/month, returns exactly the days that should appear in that month's 6-row grid (including outside-month days from adjacent months).
- `musicStatus` / `rotaStatus` computation in `services/page.tsx` data shaping — green/amber/red signals for representative inputs.

### Rendering tests (new)

Using the existing Vitest + React Testing Library setup:

- `ServicesCalendarCell` empty day (no liturgical data).
- `ServicesCalendarCell` Sunday with one service (editor role).
- `ServicesCalendarCell` Sunday with one service (member role).
- `ServicesCalendarCell` Sunday with two stacked services.
- `ServicesCalendarCell` Sunday with three services (collapses to "+ 1 more").
- `ServicesCalendarCell` weekday feast with no service.
- `ServicesCalendarCell` outside-month day.
- `ServicesCalendarCell` empty Sunday, editor sees "+ Plan service".
- `ServicesCalendarHeader` Today button disabled when already on current month.
- `ServicesCalendarMonthPicker` year stepper + month click jumps correctly.

### E2E

No new Playwright tests required. The existing services-page E2E tests should pass unchanged because the route, toggle, and fallback behaviour are preserved. Manually verify the mobile-fallback behaviour in a `375px` viewport after implementation.

### Accessibility checks

- All cards, buttons, and popover triggers are native `<a>`/`<button>` elements, keyboard-focusable by default.
- Focus rings inherited from the global `:focus-visible` rule — no custom styling needed.
- Service card `aria-label` summarising the content (e.g. *"15 November, Trinity 23, Sung Eucharist at 10:00, three hymns planned"*) so screen readers get a single coherent announcement per card instead of the individual text fragments.
- Season ribbon uses `aria-hidden="true"` — it's purely decorative; the season info is already conveyed through the service cards and feast names.
- Today indicator announces `"Today"` via an `sr-only` span.
- Colour is never the only signal — every status dot has a small-caps text label next to it, every availability state has an icon + label, every liturgical colour has a text label in the meta line.

---

## Design Tokens Used

All existing — **zero new tokens needed**.

- `--color-liturgical-purple`, `--color-liturgical-gold`, `--color-liturgical-green`, `--color-liturgical-red`, `--color-liturgical-white`, `--color-liturgical-rose`
- `--primary`, `--primary-foreground`, `--primary-hover`
- `--background`, `--card`, `--border`, `--muted`, `--muted-foreground`
- `--success`, `--warning`, `--destructive` (for status dots)
- `.small-caps`, `.font-tabular` utilities
- Cormorant Garamond (headings), Libre Baskerville (body)

## Primitives Used

All existing — **zero new primitives needed**.

- `Button`, `buttonVariants`
- `Popover`, `PopoverTrigger`, `PopoverContent`
- `Card` (for popover content)
- `cn()`

---

## Out of Scope (future iterations)

- Re-fetching data when navigating beyond the pre-fetched range (currently the user sees empty cells if they navigate ~6+ months away from "now")
- Hover previews / inline side panels / context menus
- Keyboard shortcuts (J/K/T)
- Service-type filters
- "Jump to first gap" shortcut for editors
- Drag-to-reschedule
- Week numbers
- Year view / multi-month view
- Calendar view on mobile
- Printable calendar (use existing service-sheet export for per-service print)
- Real-time updates (if another user plans a service, the calendar won't auto-update until next navigation)

---

## Implementation Sequencing (suggested order)

1. **Data model widening**: update `service-views.ts`, `services/page.tsx` query and shaping, and `services-list.tsx` to handle the new `services[]` array. This is a prerequisite — everything else builds on it. Ship it first, verify existing list view still works, then move on.
2. **Header + month picker**: build `ServicesCalendarHeader` and `ServicesCalendarMonthPicker`, wire them to simple internal state. No grid yet.
3. **Grid shell**: replace the body of `ServicesCalendar` with the grid + outside-month handling + today indicator. Render placeholder cell content (just day numbers and raw service titles). Verify navigation works.
4. **Season ribbon**: add `ServicesCalendarSeasonRibbon` and slot it in above the grid.
5. **Dense service cards**: implement `ServicesCalendarCell` with the dispatch to editor/member variants, including music preview, status dots, availability indicator, multi-service stacking, and the "+ Plan service" editor affordance.
6. **Responsive fallback**: update `ServicesViewWrapper` to hide the toggle and force list view below `md`.
7. **Tests**: backfill the unit and rendering tests listed above.
8. **Accessibility pass**: verify ARIA labels, focus order, keyboard behaviour; run axe on the page.
9. **Visual QA**: spot-check November 2026 (the sample used throughout brainstorming) with real data to confirm the ribbon proportions and cell density work out.
