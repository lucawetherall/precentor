# UX Improvements Design — Role-Aware Surfaces (Scoped)

**Date:** 2026-03-28
**Status:** Draft
**Scope:** Three high-impact changes to improve functionality, UX, usability, and ease of use across the whole site, prioritising the two primary user roles.

## Context

Precentor is a church music planning tool pre-rollout. Two user types will use it:

- **Director of Music (DoM):** Plans services, chooses music, manages rota, generates service sheets. Thinks in calendar-overview mode — scanning weeks ahead for gaps, then drilling into specifics.
- **Choir members:** Mark availability for upcoming Sundays, check what music is planned so they can prepare, download service sheets. Want to get in, do the thing, get out.

The existing visual design is strong — cohesive liturgical aesthetic, good typography, solid accessibility. The problems are structural: wrong entry point, no overview surface, flat navigation that doesn't reflect usage priority, and an information-sparse Sundays list that forces click-through to understand planning state.

The app should feel like a well-organised notebook. Open, flip to the right page, done.

## Design Principles for This Work

1. **Quick and quiet** — minimise clicks, minimise decisions. Show the right information at the right time.
2. **Role-aware, not role-separated** — shared page structures with different emphasis per role. Not two separate apps.
3. **Presence vs absence as the primary signal** — rather than status dots or progress bars, the most powerful indicator is whether something exists or is missing.
4. **Respect the existing design system** — liturgical colour bars, Cormorant headings, monospace labels, minimal border radius. All changes use existing tokens and patterns.

## Change 1: Smart Entry + Church Overview Page

### Problem

After login, all users land on a churches list page (`/churches`). Most users belong to one church. The list is a speed bump — an extra click with no value. Once inside a church, there's no overview; users go straight to the Sundays list and must navigate between separate pages (Rota, Service Sheets) for related information.

### Solution

#### Smart Entry Routing

When a user logs in or navigates to `/dashboard`:
- If they belong to **one church**, redirect to `/churches/[churchId]` (the overview).
- If they belong to **multiple churches**, show the churches list as a compact picker.

Implementation: modify the dashboard page (or middleware) to check membership count and redirect accordingly. The `/churches` list page remains accessible but is no longer the default landing.

#### Church Overview Page

New page at `/churches/[churchId]` (the index route, currently unused — users land on `/churches/[churchId]/sundays`).

**Shared structure (both roles):**
- **"This Sunday" hero section** — the nearest upcoming liturgical day with its services. Always the first thing visible.
- Liturgical colour context (colour bar, season name).

**DoM-specific sections:**
- **Service cards with completeness indicators:** Each service for "this Sunday" shown as a card displaying service type, time, and a rota summary (e.g. "6 confirmed · 2 tentative · no bass"). Voice part gaps surfaced directly.
- **"Needs attention" list:** Upcoming Sundays where something is incomplete — no services created, music slots empty, rota gaps. Sorted by nearest date. Each row links to the relevant Sunday detail page. Only shows items that need work; fully planned weeks are omitted.

**Member-specific sections:**
- **Service cards with availability toggles:** Each service for "this Sunday" shown with the 3-state availability widget (✓ ? ✗) inline, plus the planned music listed directly (hymns, anthem, canticles, responses). Service sheet download link on the card if a sheet has been generated.
- **"My availability" list:** The next 4–6 Sundays with inline availability toggles. Each row shows the liturgical day name, date, and liturgical colour bar. Members can set their availability for weeks ahead without leaving this page.

**Role detection:** Already available — `userRole` is passed to the sidebar component from the church layout. The overview page receives the same prop and conditionally renders sections.

**Data requirements:** The overview page needs:
- Upcoming liturgical days (already queried on the Sundays page).
- Services per liturgical day with music slot fill state (new query — join services with music slots, count filled vs total).
- Availability for the current user (already queried on the rota page).
- Rota summary per service — count of confirmed/tentative/unavailable, grouped by voice part (new query).
- Service sheet existence per service (check if sheet has been generated — existing data).

### Routes Affected

| Route | Change |
|---|---|
| `/dashboard` | Add redirect logic: single-church → `/churches/[id]`, multi-church → show list |
| `/churches/[churchId]` (new) | New overview page component |
| `/churches/[churchId]/layout.tsx` | Ensure overview is the index route |

## Change 2: Sundays Page Redesign

### Problem

The current Sundays page (`/churches/[churchId]/sundays`) is a flat list of upcoming liturgical days. Each row shows date, Church of England name, liturgical colour bar, and season. All rows look identical regardless of planning state. The DoM cannot tell which weeks have services created, which are fully planned, and which are empty — they must click into every single one.

### Solution

Enrich each row to show the services that exist for that Sunday.

**Row structure:**
- Liturgical colour bar (left edge, as now).
- Date in monospace (as now).
- Liturgical day name in Cormorant heading (as now).
- **Services inline:** List of services created for this day, each showing service type and time (e.g. "Sung Eucharist 10:00 · Choral Evensong 18:30").
- **Empty state:** If no services exist for a day, show "No services created" in red italic (`text-destructive`, italic). This is the primary signal — weeks that need attention are visually distinct.
- Season label on the right (as now).

**What is NOT included:** Per-service status dots (music/rota/sheet completeness). The overview page handles that for "this Sunday." The Sundays list stays scannable — presence vs absence of services is the signal.

**Data requirements:** The Sundays page currently queries `liturgicalDays` only. It now needs a left join to `services` to get service type and time per day. This is a single additional join in the server component query.

**Member view:** Same layout. Members see the same service names and times. No difference in information — members benefit from seeing what services are planned too.

### Routes Affected

| Route | Change |
|---|---|
| `/churches/[churchId]/sundays/page.tsx` | Updated query (join services), updated row rendering |

## Change 3: Simplified Navigation

### Problem

The sidebar has 7 items for admins (Sundays, Rota, Repertoire, Service Sheets, Members, Settings, Templates), all presented at equal visual weight. For a tool that should feel like flipping to the right page, this is too many choices. Repertoire and Service Sheets are secondary features — useful but not daily drivers. There's no "home" to return to an overview. The "All Churches" back link is noise for single-church users.

### Solution

#### Restructured Sidebar

**Primary section (always visible, default text weight):**
- Overview (new — Home icon)
- Sundays (Calendar icon)
- Rota (Users icon)

**"More" section (below a divider, muted text colour):**
- Repertoire (Music icon)
- Service Sheets (FileText icon)

**"Admin" section (admin/editor only, below a second divider, muted text):**
- Members (Users icon)
- Settings (Settings icon)

**Templates removed as a nav item.** It is already at `/churches/[churchId]/settings/templates` — it becomes a tab or section within the Settings page rather than a top-level nav entry.

**"All Churches" back link removed from sidebar.** For single-church users (the majority), it adds no value. For multi-church users, a church switcher in the sidebar footer (near sign-out) or a small dropdown by the church name replaces it.

#### Section labels

The "More" and "Admin" dividers use the existing monospace-uppercase-muted pattern (`font-mono text-xs uppercase tracking-wider text-muted-foreground`) already used for section headers elsewhere in the app.

#### Member sidebar

Members see: Overview, Sundays, Rota (primary) + Repertoire, Service Sheets (more). No admin section. 5 items total.

### Routes Affected

| Route | Change |
|---|---|
| `/churches/[churchId]/layout.tsx` | Updated navItems generation — grouped with section metadata |
| `church-sidebar.tsx` | Render nav groups with dividers and section labels |
| `/churches/[churchId]/settings/page.tsx` | Add templates as a tab/section within settings |

## Consistency Fixes (Included)

While implementing the three main changes, the following minor inconsistencies from the audit should be addressed:

1. **Auth page inputs:** Replace inline `<input>` elements on login/signup with the `Input` component for consistency.
2. **Availability widget colours:** Replace hardcoded Tailwind colours (`bg-green-600`, `bg-amber-500`, `bg-red-600`) with theme tokens (`bg-success`, `bg-warning`, `bg-destructive`) in the availability widget.
3. **Responsive padding:** Standardise all page containers to use `p-4 sm:p-6 lg:p-8 max-w-4xl` (the responsive variant) instead of the inconsistent mix of `p-8 max-w-4xl`.

## Out of Scope

- Visual redesign (colours, typography, border radius) — the existing design system is strong.
- New features (search, notifications, calendar sync).
- Rota grid redesign — the current implementation is well-built with good responsive behaviour.
- Service planner page changes — the tab-based service creation flow works well.
- Landing page / marketing page changes.
- Dark mode.

## Technical Notes

- **No new dependencies required.** All changes use existing components and patterns.
- **Database queries:** Two new queries needed — services-per-liturgical-day join (for Sundays page) and overview aggregation query (services + music slot counts + availability + rota summary). Both are straightforward Drizzle ORM joins.
- **No schema changes.** All data already exists in the database.
- **Component reuse:** The availability 3-state toggle widget already exists and can be reused on the overview page. The liturgical colour bar pattern already exists on the Sundays page.
- **Server vs client components:** The overview page will need client-side interactivity for availability toggles (like the rota grid). The "needs attention" section and Sundays list can remain server components.
