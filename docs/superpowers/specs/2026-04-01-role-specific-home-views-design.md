# Role-Specific Home Views — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Problem

The Precentor church home page (`/churches/[churchId]`) currently serves both directors of music and choir members with a generic layout. This creates three live pain points:

1. **Members don't know what they're singing until very late** — they must actively navigate into a service to find out.
2. **Directors can't quickly see who's confirmed vs who hasn't responded** — availability and rota data are only visible on the dedicated rota page.
3. **Members lack a focused personal view** — there's no clear answer to "what do I need to do right now?".

Scope is strictly in-app. No email notifications are included in this spec.

---

## Approach

Redesign the church home page to serve each role a tailored landing view. No new routes — both roles continue to land on `/churches/[churchId]`. The role-branch logic already exists in the page component; we are replacing/enhancing the components rendered inside each branch.

All data required already exists in the database. This is a query and UI layer change only — **no schema migrations required**.

---

## Naming & Roles

Throughout this spec, "director" refers to any member with role `ADMIN` or `EDITOR`. "Member" refers to role `MEMBER`. The existing `hasMinRole` utility handles this check.

The "Missing availability responses" amber alert in the director view queries **only `MEMBER`-role members**. This is intentional — directors manage their own availability independently and are not expected to be prompted by the needs-attention panel.

---

## Service Status Filtering

- **Member views** query only `PUBLISHED` services. Members should not see `DRAFT` services.
- **Director views** query both `DRAFT` and `PUBLISHED` services, so directors can act on incomplete drafts before they go live.

---

## Page Greeting

The greeting reads "Good morning, {name}" where `{name}` is the full `users.name` field (the `users` table has a single `name` column, not split first/last name fields). The greeting is **always "Good morning"** regardless of time of day — this is intentional simplicity; time-of-day switching is out of scope.

`users.name` is nullable in the schema (no `.notNull()`). When null, fall back to the user's email address. If email is also unavailable for any reason, omit the name entirely and render "Good morning" with no name.

---

## Rendering Architecture

The existing `page.tsx` performs a single monolithic `Promise.all` fetch before rendering. This spec changes that pattern:

- The top-level `requireChurchRole()` auth check and role-branching logic remain **outside** any Suspense boundary — they must run before anything renders.
- Each new data-fetching component below that point is wrapped in its own `<Suspense fallback={<SectionSkeleton />}>` boundary, allowing sections to stream independently.
- All new components are **server components** that fetch their own data — except `MemberAvailabilityQueueClient` (see below), which is a thin client wrapper.

---

## Member View — "My Week"

### Layout (top to bottom)

#### 1. Page header
- Church name (small, uppercase label)
- Greeting: "Good morning, {users.name}"

#### 2. Your next service (hero card) — `MemberHero`
- Renders only when the member has a **confirmed** rota entry (`rotaEntries.confirmed = true`) for an upcoming `PUBLISHED` service.
- Displays: liturgical name, service type, date, time.
- Liturgical season colour bar on the right edge.
- Confirmation status badge: "✓ You're confirmed".
- **What you're singing**: lists all filled music slots as labelled chips. Extend `getMusicForServices` to also join `massSettings` (for `massSettings.name`), `canticleSettings`, and `responsesSettings`. Note: `massSettings.name` and `responsesSettings.name` are both `NOT NULL` in the schema — no fallback needed for those. `canticleSettings.name` is nullable — when null, fall back to the `canticleSettings.canticle` enum value (e.g. `"MAGNIFICAT"`).
- If no slots are filled: show muted "Music not yet planned" message.
- If no confirmed rota entry exists: omit the card entirely. The Coming up section still renders.

#### 3. Your availability needed — `MemberAvailabilityQueue` + `MemberAvailabilityQueueClient`

**Data:** upcoming `PUBLISHED` services where the member has no availability row at all (`LEFT JOIN`, null result) or has `status = 'TENTATIVE'`.

**Component split:**
- `MemberAvailabilityQueue` is a **server component** that fetches the list and renders it.
- Each row's buttons are rendered by `MemberAvailabilityQueueClient`, a **`"use client"` component** that receives the `serviceId` and `churchId` as props, calls `POST /api/churches/[churchId]/availability` on click, then calls `router.refresh()` (via `useRouter` from `next/navigation`) to revalidate the page.
- The two available actions are "Available" (`status: 'AVAILABLE'`) and "Can't make it" (`status: 'UNAVAILABLE'`). There is no "Tentative" button — if the member previously responded TENTATIVE, the service reappears here so they can commit to a definitive answer. A helper text "You previously responded maybe" is shown for TENTATIVE rows to explain why the service has reappeared.

**Layout:** each row shows liturgical name + date, service type + time, then the two action buttons.

- Badge on the section header shows pending count.
- The section is hidden entirely when there are no pending responses.

#### 4. Coming up — `MemberUpcomingList`
- Rolling list of the next 8 upcoming `PUBLISHED` services.
- Each row: liturgical name + date, service type, personal rota status chip.
- Chip logic (mutually exclusive, evaluated in order):
  1. "✓ You're in" (green) — `rotaEntries.confirmed = true` for this member
  2. "Awaiting rota" (muted amber) — member has `AVAILABLE` or `TENTATIVE` availability entry but no confirmed rota entry (same visual treatment for both states)
  3. "Can't make it" (muted grey) — member has `UNAVAILABLE` entry
  4. No chip — no availability entry exists (these services also appear in the availability queue above)

---

## Director View — "Needs Attention"

### Layout (top to bottom)

#### 1. Page header
- Church name (small, uppercase label)
- Greeting: "Good morning, {users.name}"
- "**+ Plan service**" primary button, top-right, links to service creation.

#### 2. Needs attention panel — `DirectorNeedsAttention`
- Aggregated urgency list, red items first then amber.

**Red items:**
- **Rota gap:** a service (DRAFT or PUBLISHED) within the next **4 weeks** where at least one voice part (`SOPRANO`, `ALTO`, `TENOR`, `BASS`) has zero confirmed singers (`rotaEntries.confirmed = true`). Display which voice parts are missing (e.g. "Alto section empty"). Link: "View rota →". Members with no `voicePart` assigned (`churchMemberships.voicePart IS NULL`) are excluded from this calculation — only the four named parts are evaluated.
- **Music not planned:** a service (DRAFT or PUBLISHED) within the next **4 weeks** with no filled music slots (see "Unplanned service detection" below). Link: "Plan music →".

**Amber items:**
- **Missing availability responses:** upcoming `PUBLISHED` services where one or more `MEMBER`-role members have no availability entry. Display `users.name` for up to 3 members, then "+N more". Link: "View rota →".

**Empty state:** if no items exist, show a green "All services are in good shape" callout in place of the list.

Badge on header shows total item count.

**Unplanned service detection:** replicate the logic from the existing `getNeedsAttention` function in `src/lib/db/queries/overview.ts`. That function uses a subquery to check for the presence of music slots with actual content — do not use a naive "no rows in musicSlots" check, because template-generated placeholder slots exist without content. The relevant logic is the check that distinguishes empty template slots from genuinely filled slots. Extract this into a shared helper rather than duplicating it.

#### 3. Next service card — `DirectorNextService`
- Shows the **next upcoming service chronologically** (DRAFT or PUBLISHED), regardless of day of week.
- Displays: liturgical name, service type, date, time.
- **Voice part breakdown grid** (2×2 — Sop / Alto / Ten / Bass): call `getRotaSummary(serviceIds, churchId)` from `src/lib/db/queries/overview.ts`. Note that the current implementation counts **all** rota entries, not just `confirmed = true`. **Extend `getRotaSummary`** to filter on `rotaEntries.confirmed = true` before this change ships — do not leave the unfiltered behaviour in place as it will cause incorrect counts throughout the app.
- Colour coding per voice part cell: green (≥1 confirmed), amber (0 confirmed but ≥1 `AVAILABLE` availability entry), red (0 confirmed, 0 available). This requires joining the `availability` table per-voice-part. If extending `getRotaSummary` to return this is complex, implement `getVoicePartBreakdown(serviceId, churchId)` as a separate focused function rather than overloading the existing one.
- Music summary: all filled slots as chips.
- Direct link to the service editor page.

#### 4. Upcoming — `DirectorUpcomingList`
- Rolling list of the next 8 upcoming services (DRAFT and PUBLISHED).
- Each row: liturgical name + date, service type, aggregate rota summary ("X/Y confirmed"), health indicator dot.
- **Health rules** (evaluated per service — all use the same **4-week** threshold for both rota gaps and music planning):
  - 🟢 Green: all 4 voice parts have ≥1 confirmed singer AND at least one music slot is filled.
  - 🟡 Amber: any voice part has 0 confirmed singers (but service is **more than 4 weeks away**), OR music is unplanned (but service is **more than 4 weeks away**), OR any `MEMBER` has not responded availability.
  - 🔴 Red: any voice part has 0 confirmed singers AND service is within **4 weeks**, OR music is unplanned AND service is within **4 weeks**.

  > The 4-week threshold is used uniformly across the Needs Attention panel, the `getRotaGaps` query (withinWeeks=4), and the Upcoming health dots. Services beyond 4 weeks with issues are amber; within 4 weeks they are red.

---

## Data Queries

All queries are server-side (Drizzle ORM, PostgreSQL). No new tables.

| Function | Purpose | Key filters & joins |
|---|---|---|
| `getMemberNextConfirmedService(userId, churchId)` | Next PUBLISHED service with `rotaEntries.confirmed=true` for member, with music | `services` (PUBLISHED, date≥today), `rotaEntries` (confirmed=true, userId), `musicSlots`, `hymns`, `anthems`, `massSettings`, `canticleSettings` (name nullable — fall back to canticle enum), `responsesSettings`, `liturgicalDays` |
| `getMemberUpcomingServices(userId, churchId, limit=8)` | Next N PUBLISHED services with personal availability + rota status | `services` (PUBLISHED), `availability` (left join on userId), `rotaEntries` (left join on userId, confirmed=true), `liturgicalDays` |
| `getPendingAvailabilityRequests(userId, churchId)` | PUBLISHED services where member has no availability row OR status=TENTATIVE | `services` (PUBLISHED), `availability` (left join) — rows where entry is null OR status='TENTATIVE' |
| `getRotaGaps(churchId, withinWeeks=4)` | Services within N weeks where any of the 4 named voice parts has 0 confirmed singers | `services` (DRAFT+PUBLISHED, date within range), `rotaEntries` (confirmed=true), `churchMemberships` (voicePart IS NOT NULL) — group by voice part across SOPRANO/ALTO/TENOR/BASS only, surface services with any part count=0 |
| `getUnrespondedAvailability(churchId, withinWeeks=8)` | PUBLISHED services within N weeks with MEMBER-role members who have no availability entry | `services` (PUBLISHED, date within range), `availability` (left join), `churchMemberships` (role=MEMBER), `users` (for name display) |
| `getUnplannedServices(churchId, withinWeeks=4)` | Services within N weeks with no filled music slots | `services` (DRAFT+PUBLISHED), music slot subquery using same logic as `getNeedsAttention` in `src/lib/db/queries/overview.ts` — extract shared helper |
| Extend `getRotaSummary(serviceIds, churchId)` | Add `confirmed=true` filter to rota entry counts | Already in `src/lib/db/queries/overview.ts` — **before changing**, grep for all callers of `getRotaSummary` across the codebase and verify none depend on the current unfiltered behaviour. Then add `confirmed=true` filter. Separately, implement `getVoicePartBreakdown(serviceId, churchId)` for the amber/red per-part availability view (requires joining `availability` table per voice part — don't overload `getRotaSummary` with this). |

---

## Components

### New components

| Component | Type | Location |
|---|---|---|
| `MemberHero` | Server | `src/components/church/member-hero.tsx` |
| `MemberAvailabilityQueue` | Server (shell) | `src/components/church/member-availability-queue.tsx` |
| `MemberAvailabilityQueueClient` | Client (`"use client"`) | `src/components/church/member-availability-queue-client.tsx` |
| `MemberUpcomingList` | Server | `src/components/church/member-upcoming-list.tsx` |
| `DirectorNeedsAttention` | Server | `src/components/church/director-needs-attention.tsx` |
| `DirectorNextService` | Server | `src/components/church/director-next-service.tsx` |
| `DirectorUpcomingList` | Server | `src/components/church/director-upcoming-list.tsx` |

### Modified files

| File | Change |
|---|---|
| `src/app/(app)/churches/[churchId]/page.tsx` | Replace old components with new ones; wrap each in `<Suspense fallback={<SectionSkeleton />}>`. Auth check and role branch remain outside Suspense. |
| `src/lib/db/queries/services.ts` (or nearest equivalent) | Add `getMemberNextConfirmedService`, `getMemberUpcomingServices`, `getPendingAvailabilityRequests`, `getRotaGaps`, `getUnrespondedAvailability` |
| `src/lib/db/queries/overview.ts` | Extend `getRotaSummary` to filter `confirmed=true`; extract unplanned-slot detection into a shared helper; optionally add `getVoicePartBreakdown` |
| `src/lib/db/queries/music.ts` (or nearest equivalent) | Extend `getMusicForServices` to join `massSettings`, `canticleSettings`, `responsesSettings` with null-safe name fallbacks |

---

## Error & Empty States

- **Member, no upcoming PUBLISHED services:** Muted "No services scheduled yet" in the Coming up section.
- **Member, no confirmed rota entry:** Hero card omitted; Coming up list still renders.
- **Member, all availability submitted:** Availability queue section hidden entirely.
- **Director, nothing needs attention:** Green "All services are in good shape" callout replaces urgency list.
- **Director, no upcoming services:** Next service card shows "No upcoming services — plan one to get started" with link.
- **Loading:** Each Suspense boundary shows a `<SectionSkeleton />` (existing `Skeleton` component with `animate-pulse`).

---

## Accessibility

- All status chips use colour + text label, never colour alone.
- Voice part grid cells include `aria-label` (e.g. `aria-label="Soprano: 3 confirmed"`).
- Availability buttons include descriptive labels (e.g. `aria-label="Mark available for Easter 4, 13 April"`).
- Needs-attention items use `role="list"` / `role="listitem"`.
- Health indicator dots include `aria-label` describing the status in words (e.g. `aria-label="Status: needs attention"`).

---

## Out of Scope

- Email or push notifications when a service is published.
- Changes to the rota, services, or repertoire pages.
- Any database schema migrations.
- Mobile-specific layout changes beyond existing responsive grid patterns.
- Time-of-day greeting switching ("Good afternoon", "Good evening").
- Splitting `users.name` into first/last name.
- Making ADMIN/EDITOR availability visible in the director needs-attention panel.

---

## Verification

1. **Member (role=MEMBER):**
   - Hero card renders only when `rotaEntries.confirmed=true` exists for an upcoming PUBLISHED service.
   - Music chips include mass settings and canticles (not just hymns/anthems); canticle with null name shows enum value fallback.
   - Availability queue shows services with no entry OR `TENTATIVE` status; TENTATIVE rows show "You previously responded maybe" helper text.
   - Clicking "Available" POSTs to the API; page revalidates via `router.refresh()`; queue updates to remove the responded row.
   - Coming up chips correctly reflect confirmed / awaiting rota / can't make it states.
   - No DRAFT services appear in any member section.

2. **Director (role=ADMIN or EDITOR):**
   - Needs Attention lists rota gaps with voice part names, missing availability with member names, and unplanned services within 4 weeks.
   - Needs Attention panel is empty → green callout shown.
   - Next service card shows correct per-voice-part counts using confirmed=true filter (verify by checking a service where some entries are unconfirmed — they must not be counted).
   - Voice part cells correctly show amber when availability exists but no confirmed entry.
   - All other callers of `getRotaSummary` (if any) are verified to still work correctly after the confirmed=true filter is added.
   - Upcoming health dots use a consistent 4-week threshold (no 2-week variation).
   - DRAFT services appear in director sections.

3. **Loading states:** throttle network in DevTools; each section shows skeleton independently while data fetches.

4. **Null name:** log in as a user with a null `users.name` — greeting falls back to email address.
5. **Regression:** run full Playwright e2e suite — no failures on any existing test.
