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

## Member View — "My Week"

### Layout (top to bottom)

#### 1. Page header
- Church name (small, uppercase)
- Personalised greeting: "Good morning, {firstName}"

#### 2. Your next service (hero card)
- Renders only when the member has a confirmed rota entry for an upcoming service.
- Displays: liturgical name, service type, date, time.
- Liturgical season colour bar on the right edge of the card.
- Confirmation status badge ("✓ You're confirmed" / "Awaiting confirmation").
- **What you're singing** section: lists all filled music slots (hymns, anthem, mass setting) as labelled chips. If music is not yet planned, shows a muted "Music not yet planned" message.
- If no confirmed service exists, the card is omitted entirely.

#### 3. Your availability needed
- Lists upcoming services where the member has **no availability entry** (status is null).
- Each row: liturgical name + date, service type + time, inline "Available" / "Can't make it" buttons.
- Submitting updates the `availability` table via existing `POST /api/churches/[churchId]/availability`.
- Badge on the section header shows count of pending responses.
- Hidden when all availability is submitted.

#### 4. Coming up
- Rolling list of the next ~8 upcoming services the church has scheduled.
- Each row: liturgical name + date, service type, personal rota status chip.
- Rota status chips: "✓ You're in" (green), "Awaiting rota" (muted), "Not on rota" (muted grey).

---

## Director View — "Needs Attention"

### Layout (top to bottom)

#### 1. Page header
- Church name (small, uppercase)
- Personalised greeting: "Good morning, {firstName}"
- "**+ Plan service**" primary button, top-right.

#### 2. Needs attention panel
- Aggregated list of items requiring director action, ordered by urgency (red before amber).
- **Red items** (critical):
  - Rota incomplete: a confirmed voice part section has zero singers for an upcoming service.
  - Music not planned: a service within the next 4 weeks has no filled music slots.
- **Amber items** (warning):
  - Members haven't responded: one or more members have no availability entry for an upcoming service. Shows names (up to 3, then "+N more").
- Each item has a direct action link ("View rota →", "Plan music →").
- Badge on section header shows total item count.
- If nothing needs attention, shows a green "All services are in good shape" message.

#### 3. This Sunday
- Highlighted card for the next upcoming Sunday service.
- Displays: liturgical name, service type, time.
- **Voice part breakdown grid** (2×2): Sop / Alto / Ten / Bass — confirmed count per part, colour-coded (green = healthy, amber = low, red = empty).
- Music summary: all filled slots shown as chips.
- Direct link to the service editor.

#### 4. Upcoming
- Rolling list of the next ~8 services.
- Each row: liturgical name + date, service type, aggregate rota status ("X/Y confirmed"), health indicator dot (green / amber / red).
- Health rules:
  - Green: all voice parts have ≥1 confirmed singer AND music is planned.
  - Amber: some availability missing OR rota partially filled.
  - Red: a voice part is empty OR music is unplanned with service within 2 weeks.

---

## Data Queries

All queries are server-side (Drizzle ORM, PostgreSQL). No new tables.

| Function | Purpose | Tables joined |
|---|---|---|
| `getMemberNextConfirmedService(userId, churchId)` | Next service the member is on the rota for, with music slots | `services`, `rotaEntries`, `musicSlots`, `hymns`, `anthems`, `massSettings`, `liturgicalDays` |
| `getMemberUpcomingServices(userId, churchId, limit)` | Next N services with personal availability + rota status | `services`, `availability`, `rotaEntries`, `liturgicalDays` |
| `getPendingAvailabilityRequests(userId, churchId)` | Services where member has no availability entry | `services`, `availability` (left join) |
| `getRotaGaps(churchId)` | Services with zero confirmed singers in any voice part | `services`, `rotaEntries`, `churchMemberships` |
| `getUnrespondedAvailability(churchId)` | Members with no availability entry per upcoming service | `services`, `availability` (left join), `churchMemberships` |
| `getUnplannedServices(churchId)` | Services within 4 weeks with no filled music slots | `services`, `musicSlots` (left join) |
| `getRotaSummaryByVoicePart(serviceId, churchId)` | Count of confirmed singers per voice part | `rotaEntries`, `churchMemberships` |

---

## Components

### New / replaced components

| Component | Location | Notes |
|---|---|---|
| `MemberHero` | `src/components/church/member-hero.tsx` | Hero card for next confirmed service |
| `MemberAvailabilityQueue` | `src/components/church/member-availability-queue.tsx` | Inline availability buttons for pending services |
| `MemberUpcomingList` | `src/components/church/member-upcoming-list.tsx` | Rolling coming-up list with rota status chips |
| `DirectorNeedsAttention` | `src/components/church/director-needs-attention.tsx` | Aggregated urgency panel |
| `DirectorThisSunday` | `src/components/church/director-this-sunday.tsx` | This Sunday card with voice-part grid |
| `DirectorUpcomingList` | `src/components/church/director-upcoming-list.tsx` | Rolling list with health indicator dots |

### Modified

| File | Change |
|---|---|
| `src/app/(app)/churches/[churchId]/page.tsx` | Replace `MemberThisSunday`, `MyAvailabilityList`, `DomThisSunday`, `NeedsAttention` with new components above |

---

## Error & Empty States

- **Member, no upcoming services:** Show a friendly empty state with a message that no services have been scheduled yet.
- **Member, no rota assignments:** Hero card is omitted; "Coming up" list still shows church services.
- **Director, nothing needs attention:** Green "All services are in good shape" message replaces the urgency list.
- **Data loading:** Use existing Skeleton components with `animate-pulse` for each card section.

---

## Accessibility

- All status chips use colour + text, never colour alone.
- Voice part grid cells include `aria-label` (e.g. "Soprano: 3 confirmed").
- Availability buttons include accessible labels (e.g. "Mark available for Easter 4").
- Needs-attention items use `role="list"` and `role="listitem"`.

---

## Out of Scope

- Email or push notifications when a service is published.
- Changes to the rota, services, or repertoire pages.
- Any database schema migrations.
- Mobile-specific layout changes beyond the existing responsive grid patterns.

---

## Verification

1. Log in as a **choir member** → `/churches/[churchId]` shows hero card with next confirmed service and music. Availability queue shows only services with no response. Coming up list shows correct rota status chips.
2. Log in as a **director** → Needs Attention panel lists rota gaps, missing responses, unplanned music. This Sunday card shows correct voice-part counts. Upcoming list shows correct health dots.
3. Member submits availability via inline buttons → page reflects updated status without full reload.
4. All sections render skeleton loaders while data fetches.
5. Run existing Playwright e2e suite — no regressions.
