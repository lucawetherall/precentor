# Member Service Views — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Enhance existing choir planning views so all roles (MEMBER, EDITOR, ADMIN) can see upcoming services in list/agenda/calendar formats, view music for each service, and register availability.

---

## Problem

The current `/sundays` and `/sundays/[date]` pages are oriented toward admins and editors. Choir members who log in have no clean, read-only view of upcoming services, music lists, or a way to register their availability without navigating the full admin planner UI.

---

## Goals

1. All roles can see upcoming services in **three switchable views**: List, Agenda, Calendar.
2. All roles can **register availability** (Yes / Maybe / No) inline — from the list/agenda/calendar cards and from the service detail page.
3. All roles can open a service and see **music**, **readings**, and **collect** in a clean read-only layout.
4. Editors and admins retain full access to the existing service planner via an edit button.
5. No new routes — role-aware rendering within existing pages.

---

## Non-Goals

- A separate "member portal" at a different URL.
- Cross-church aggregate views (navigation remains per-church).
- Changes to the rota grid or member management pages.
- Mobile-specific optimisations (responsive but not mobile-first).

---

## Architecture

**Approach:** Role-aware rendering within existing pages. The authenticated user's `churchMemberships.role` (MEMBER | EDITOR | ADMIN) determines which UI sections are shown. No new routes are needed.

### Auth and Role Propagation

Both server page components (`sundays/page.tsx` and `sundays/[date]/page.tsx`) currently make no auth calls. Both must be updated to call `requireChurchRole(churchId, "MEMBER")` at the top of the render function, which returns `{ user, membership, error }`. The resulting `userId` and `membership.role` are passed as props to all child components that need them. Unauthenticated or non-member requests are handled by the returned `error` response.

---

## Page 1: Sundays (`/churches/[churchId]/sundays`)

### View Toggle

A `SundaysViewWrapper` client component wraps the page content. The selected view mode is persisted in the URL search param `?view=list|agenda|calendar` so browser history and link-sharing work correctly. Defaults to `list`.

```ts
interface SundaysViewWrapperProps {
  churchId: string
  userId: string
  role: 'MEMBER' | 'EDITOR' | 'ADMIN'
  liturgicalDays: LiturgicalDayWithService[]  // joined: day + service + user availability + slot previews
}
```

All data for all three views is fetched once on the server and passed as a single prop bundle. Switching views is purely a client-side re-render — no additional network requests.

### List View (`SundaysList`)

The existing card layout, enhanced:
- Liturgical colour bar on the left edge (unchanged).
- Date (monospace), service name (heading font), season label (unchanged).
- **New:** `AvailabilityWidget` on the right — three always-visible buttons: ✓ Yes / ? Maybe / ✗ No. Active state is filled; inactive is outlined. Click toggles; clicking the active button deselects.

### Agenda View (`SundaysAgenda`) — new

Services grouped under month headings (e.g. "April 2026"). Each card:
- **Left column:** Large day number + abbreviated day name.
- **Body:** Service name, season chip (coloured border), service type and time, music preview (up to 4 slot titles from populated `musicSlots`; "Music not yet planned" if no slots exist).
- **Right column:** `AvailabilityWidget` stacked vertically, labelled "Availability".

### Calendar View (`SundaysCalendar`) — new

Standard 7-column month grid, **Mon–Sun column order** (ISO week layout, consistent with common calendar conventions). Controls: prev/next month chevrons + month/year heading. Sunday is the rightmost column and is visually distinguished (column header + date number in primary colour).

- Non-service cells: date number only, muted background.
- Sunday cells with services: liturgical-colour left border on a nested block, service name, compact `AvailabilityWidget` (three small buttons below the name).
- **Holy day labels:** Non-Sunday `liturgicalDays` rows within `HOLY_WEEK` season (e.g. Maundy Thursday, Good Friday, Holy Saturday) are rendered with a small tinted label using `liturgicalDays.cwName` and a background tint derived from `liturgicalDays.colour` via `LITURGICAL_COLOURS`. Detection: `season === 'HOLY_WEEK'` AND the day of the week is not Sunday.
- Sundays are visually distinguished (column header + date number in primary colour).

### Data Fetching

The page server component fetches:
1. `liturgicalDays` from today onwards (existing).
2. `services` for the church joined to those days (to get service type, time, status).
3. The current user's `availability` rows for those services.
4. Up to 4 populated `musicSlots` per service (joined to `hymns`/`anthems` to resolve display titles for the agenda preview). This replaces the earlier notion of "slot counts" — actual titles are required.

---

## Page 2: Service Detail (`/churches/[churchId]/sundays/[date]`)

### Role-Aware Layout

| Section | MEMBER | EDITOR | ADMIN |
|---|---|---|---|
| Service header (name, date, type/time, season) | ✓ read-only | ✓ + confirmed singer count | ✓ + confirmed singer count |
| **Availability widget** (own status) | ✓ | ✓ | ✓ |
| Readings (all positions) | ✓ read-only | ✓ read-only | ✓ read-only |
| Collect text | ✓ read-only | ✓ read-only | ✓ read-only |
| Music list | ✓ read-only | ✓ read-only | ✓ read-only |
| Editor notice + "Edit music & details" button | — | ✓ | ✓ |
| Existing full service planner | — | via edit button | via edit button |

The existing service planner is not removed — editors/admins reach it by clicking "Edit music & details", which either navigates to a dedicated edit sub-route or reveals the planner inline. This decision is deferred to the implementation plan.

The existing `SundayDetailPage` currently renders the service header, readings, collect, and `ServicePlanner` directly inline. This refactor moves those sections into `MemberServiceView` (for all roles) and shows the edit controls only for EDITOR/ADMIN. The existing readings/collect markup is not duplicated — it is relocated into the new component.

### `MemberServiceView` Component — new

Renders the read-only service detail layout:

1. **Back link** — returns to `/sundays`.
2. **Service header** — liturgical colour accent bar, season label, service name (heading font), date + service type/time (monospace). Editors/admins additionally see confirmed singer count.
3. **Availability card** — full-width card with "Are you available for this service?" prompt, large ✓/?/✗ buttons, sub-label "You can change this at any time."
4. **Two-column grid:**
   - **Readings** — each reading as a row: position label, scripture reference, first line of text (truncated).
   - **Collect** — collect text in italic serif.
5. **Music list** (`ServiceMusicList`) — full-width. Each slot: slot type label, title, detail line (composer/voicing/hymn book number). Empty slots shown as "Not yet assigned" in muted italic.

### `ServiceMusicList` Component — new

A read-only extraction of the music slot display logic from the existing service planner. Accepts an array of populated `musicSlots` and renders them grouped by position order. No editing controls.

---

## Shared Component: `AvailabilityWidget`

**Props:**
```ts
interface AvailabilityWidgetProps {
  serviceId: string
  churchId: string
  currentStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE' | null
  size: 'sm' | 'md' | 'lg'   // sm = calendar cells, md = list cards, lg = detail page
}
```

**Behaviour:**
- Renders three buttons: ✓ Yes (`AVAILABLE`) / ? Maybe (`TENTATIVE`) / ✗ No (`UNAVAILABLE`).
- Active state: filled background in green/amber/red with white text.
- Inactive state: outlined with neutral border.
- Clicking an active button deselects (removes the availability row, returning to `null`/unset state).
- **Optimistic update:** status updates immediately in UI. On error, status reverts and a toast is shown.
- Works for all roles — any authenticated church member can set their own availability.

**API calls:**
- Set/change status: `POST /api/churches/[churchId]/availability` with `{ serviceId, status }` — existing route, no changes needed.
- Deselect (remove row): `DELETE /api/churches/[churchId]/availability` with `{ serviceId }` in the request body — **new endpoint to add**. Deletes the `availability` row for `(userId, serviceId)`. Members can only delete their own; editors+ can delete for any `userId` passed in the body.

---

## Data: No Schema Changes

All required tables already exist:

| Table | Used for |
|---|---|
| `liturgicalDays` | Calendar dates, season, colour, CW name |
| `services` | Service type, time, status per church |
| `musicSlots` | Music list per service (with hymn/anthem joins) |
| `readings` | Readings per liturgical day |
| `availability` | Per-user per-service availability status (AVAILABLE/UNAVAILABLE/TENTATIVE) |
| `rotaEntries` | Confirmed singer count (editor/admin only) |

The existing `POST /api/churches/[churchId]/availability` route handles all writes.

---

## Error Handling

- **DB unavailable:** Existing graceful empty-state handling applies to all new data fetches.
- **Availability update failure:** Optimistic revert + toast notification.
- **No services for a month (calendar view):** Month renders with all non-service cells; no error state needed.
- **Music not yet planned:** Agenda and detail views show a muted "Music not yet planned" placeholder rather than an empty section.

---

## Testing

- Unit tests for `AvailabilityWidget`: renders correct active state, fires POST on status change, fires DELETE on deselect, reverts optimistically on error.
- Unit tests for `SundaysCalendar`: correct day placement for months starting on different weekdays, liturgical colour rendering, holy day label detection.
- Unit tests for `ServiceMusicList`: renders all slot types, handles empty slots gracefully.
- Integration test for the sundays page: all three views render without error for each role.
- Integration test for the service detail page: MEMBER sees no "Edit music & details" banner; EDITOR and ADMIN do. Confirm the role gate is enforced server-side (the rendered HTML for a MEMBER request must not contain the edit controls), not just client-side.

---

## Open Questions (deferred to implementation)

1. **Edit entry point:** Does "Edit music & details" navigate to a new `/sundays/[date]/edit` sub-route, or toggle the planner inline on the same page? The existing planner lives at `/sundays/[date]` — the simplest approach is a query param (`?mode=edit`) that reveals the planner for editors.

2. **View toggle persistence:** URL search params are the primary persistence mechanism. Consider also saving the last-used view to `localStorage` as a secondary default.

3. **Calendar month on load:** Default to the current month; if there are no upcoming services this month, auto-advance to the next month with a service.
