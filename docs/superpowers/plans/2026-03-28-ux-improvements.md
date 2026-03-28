# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three high-impact UX changes — smart entry routing + church overview page, Sundays page service-visibility enhancement, and simplified grouped sidebar navigation — plus consistency fixes.

**Architecture:** Server-first Next.js App Router with Drizzle ORM. New overview page at `/churches/[churchId]` as the index route. Sidebar refactored to accept grouped nav items. Dashboard redirects single-church users directly to their church overview. All queries use existing schema — no migrations needed.

**Tech Stack:** Next.js 16 (App Router), React 19, Drizzle ORM, Supabase Auth, Tailwind CSS 4, shadcn/ui components, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-28-ux-improvements-design.md`

**Important codebase context (from recent PRs #27-29):**
- The Sundays page now uses a multi-view wrapper (`SundaysViewWrapper`) with list/agenda/calendar views and already joins services + availability per liturgical day
- A reusable `AvailabilityWidget` component exists at `src/components/availability-widget.tsx`
- The nav item "Sundays" has been renamed to "Services" and a new `/services/[date]` route exists for editing
- A `Templates` nav item now exists at `/settings/templates`
- `src/lib/services/completeness.ts` exists for calculating service completeness
- Schema is split into `schema-base.ts` + `schema-liturgy.ts` (re-exported from `schema.ts` — imports from `@/lib/db/schema` still work)
- Dashboard already uses responsive padding
- `requireChurchRole` from `src/lib/auth/permissions.ts` is used for auth on the Sundays page
- Types `LiturgicalDayWithService`, `ServiceSummary`, `MusicSlotPreview` exist in `src/types/service-views.ts`

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `src/app/(app)/churches/[churchId]/page.tsx` | Church overview page (server component wrapper) |
| `src/app/(app)/churches/[churchId]/overview-dom.tsx` | DoM overview sections (server component) |
| `src/app/(app)/churches/[churchId]/overview-member.tsx` | Member overview with availability toggles (client component) |
| `src/app/(app)/churches/[churchId]/loading.tsx` | Loading skeleton for overview page |
| `src/lib/db/queries/overview.ts` | Data-fetching functions for overview page |

### Modified files
| File | Change |
|---|---|
| `src/app/(app)/dashboard/page.tsx` | Smart entry: redirect single-church users |
| `src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx` | Add "No services created" indicator for days without services |
| `src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx` | Add "No services created" indicator |
| `src/app/(app)/churches/[churchId]/layout.tsx` | Grouped navItems with section metadata |
| `src/components/church-sidebar.tsx` | Render nav groups with dividers, fix active state for Overview |
| `src/app/(auth)/login/page.tsx` | Replace `<input>` with `Input` component |
| `src/app/(auth)/signup/page.tsx` | Replace `<input>` with `Input` component |

---

## Task 1: Smart Entry Routing on Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

The dashboard already fetches user church memberships and has responsive padding. When there is exactly one membership, redirect to the church overview.

- [ ] **Step 1: Add redirect for single-church users**

In `src/app/(app)/dashboard/page.tsx`, after the memberships query and the `memberships.length === 0` onboarding redirect, add:

```tsx
if (userChurches.length === 1) {
  redirect(`/churches/${userChurches[0].churchId}`);
}
```

`redirect` is already imported from `next/navigation`.

- [ ] **Step 2: Update church card links for multi-church case**

In the "Your Churches" section, church cards currently link to `/churches/${uc.churchId}/sundays`. Update to link to the overview:

```tsx
href={`/churches/${uc.churchId}`}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`. Log in with a single-church user → should redirect to `/churches/[id]` (404 for now — expected). Multi-church user → sees dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: redirect single-church users to church overview from dashboard"
```

---

## Task 2: Sidebar Restructure — Grouped Navigation

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/layout.tsx`
- Modify: `src/components/church-sidebar.tsx`

**Current nav items on main** (from layout.tsx): Services, Rota, Repertoire, Service Sheets, Members (admin), Settings (admin), Templates (admin). The sidebar also imports `Layout` from lucide for the Templates icon.

- [ ] **Step 1: Update navItems structure in layout.tsx**

Replace the current flat `navItems` array with a grouped structure. Note that the first item is now "Services" (not "Sundays") pointing to `/churches/${churchId}/services`:

```tsx
interface NavGroup {
  label?: string;
  items: { href: string; label: string; iconName: string; exactMatch?: boolean }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: `/churches/${churchId}`, label: "Overview", iconName: "Home", exactMatch: true },
      { href: `/churches/${churchId}/sundays`, label: "Sundays", iconName: "Calendar" },
      { href: `/churches/${churchId}/rota`, label: "Rota", iconName: "Users" },
    ],
  },
  {
    label: "More",
    items: [
      { href: `/churches/${churchId}/services`, label: "Services", iconName: "FileText" },
      { href: `/churches/${churchId}/repertoire`, label: "Repertoire", iconName: "Music" },
      { href: `/churches/${churchId}/service-sheets`, label: "Service Sheets", iconName: "FileText" },
    ],
  },
  ...(isAdmin ? [{
    label: "Admin",
    items: [
      { href: `/churches/${churchId}/members`, label: "Members", iconName: "Users" },
      { href: `/churches/${churchId}/settings`, label: "Settings", iconName: "Settings" },
    ],
  }] : []),
];
```

Note: Templates is absorbed into Settings (it's already a sub-route at `/settings/templates`). The Services (editor) page moves to "More" since the Sundays page is the primary browse view for upcoming services.

Update the `ChurchSidebar` prop from `navItems` to `navGroups`.

- [ ] **Step 2: Rewrite church-sidebar.tsx to render groups**

Key changes from current sidebar:
1. Add `Home` to lucide imports and `iconMap`. Remove `Layout` (no longer needed as separate nav item).
2. Accept `navGroups: NavGroup[]` instead of `navItems: NavItem[]`.
3. Render groups with dividers and section labels.
4. Overview link uses exact match (`pathname === item.href`) to avoid matching all sub-routes.
5. Remove "All Churches" back link.
6. Secondary/admin group items use muted text colour when inactive.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, Calendar, Users, Music, FileText, Settings } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  exactMatch?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Home,
  Calendar,
  Users,
  Music,
  FileText,
  Settings,
};

function NavGroups({
  navGroups,
  pathname,
  onNavigate,
}: {
  navGroups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col flex-1">
      {navGroups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="border-t border-border my-3" />}
          {group.label && (
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1 px-2">
              {group.label}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = iconMap[item.iconName] || Calendar;
              const isActive = item.exactMatch
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const isMuted = !!group.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : isMuted
                      ? "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      : "hover:bg-sidebar-accent text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function ChurchSidebar({
  churchName,
  userRole,
  userEmail,
  navGroups,
}: {
  churchId: string;
  churchName: string;
  userRole: string;
  userEmail: string;
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel =
    userRole === "ADMIN" ? "Admin" :
    userRole === "EDITOR" ? "Editor" : "Member";

  const sidebarContent = (
    <>
      <h2 className="font-heading text-lg font-semibold mb-1 truncate" title={churchName}>
        {churchName}
      </h2>
      <p className="text-xs text-muted-foreground mb-6">{roleLabel}</p>

      <NavGroups
        navGroups={navGroups}
        pathname={pathname}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 truncate">{userEmail}</p>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="p-1 hover:bg-sidebar-accent transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-4 flex flex-col">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <span className="font-heading font-semibold truncate">{churchName}</span>
      </div>
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar p-4 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Verify sidebar**

Run: `npm run dev`. Navigate to any church page. Confirm grouped navigation renders, active states work, Overview uses exact match.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/layout.tsx src/components/church-sidebar.tsx
git commit -m "feat: restructure sidebar with grouped navigation and Overview link"
```

---

## Task 3: Sundays Page — "No Services" Indicator

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx`
- Modify: `src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx`

The Sundays page already joins services per liturgical day and shows availability widgets. The `LiturgicalDayWithService` type has `service: ServiceSummary | null` — when `null`, no service exists for that day. Currently all rows look the same whether a service exists or not. We need to surface the "No services created" state.

- [ ] **Step 1: Update SundaysList to show empty state**

In `src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx`, modify the row rendering. When `day.service` is null, show "No services created" in red italic instead of the availability widget:

Find the section that conditionally renders the availability widget:
```tsx
{day.service && (
  <div className="px-3 flex-shrink-0 border-l border-border py-3 flex flex-col items-center gap-1" ...>
```

After the closing `)}` of that block, add:
```tsx
{!day.service && (
  <div className="px-3 flex-shrink-0 border-l border-border py-3 flex items-center">
    <span className="text-xs text-destructive italic">No services created</span>
  </div>
)}
```

- [ ] **Step 2: Update SundaysAgenda similarly**

In `src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx`, find where each day card is rendered. Add a "No services created" indicator for days where `day.service` is null. Follow the same pattern — red italic text in the relevant position.

- [ ] **Step 3: Verify**

Run: `npm run dev`. Navigate to Sundays page. Days without services should show "No services created" in red. Days with services should look unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/sundays/sundays-list.tsx src/app/(app)/churches/[churchId]/sundays/sundays-agenda.tsx
git commit -m "feat: show 'No services created' indicator on Sundays page for empty days"
```

---

## Task 4: Overview Page — Data Queries

**Files:**
- Create: `src/lib/db/queries/overview.ts`

Create the `src/lib/db/queries/` directory if it does not exist.

This task creates the data-fetching functions for the overview page. These reuse existing schema imports and the existing `requireChurchRole` pattern.

- [ ] **Step 1: Create the queries file**

```tsx
import { db } from "@/lib/db";
import {
  liturgicalDays, services, musicSlots, availability,
  rotaEntries, churchMemberships,
} from "@/lib/db/schema";
import { eq, and, gte, asc, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";

/** Get the next upcoming liturgical day with its services for a church */
export async function getThisSunday(churchId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      season: liturgicalDays.season,
      serviceId: services.id,
      serviceType: services.serviceType,
      time: services.time,
    })
    .from(liturgicalDays)
    .leftJoin(
      services,
      and(
        eq(services.liturgicalDayId, liturgicalDays.id),
        eq(services.churchId, churchId)
      )
    )
    .where(gte(liturgicalDays.date, today))
    .orderBy(asc(liturgicalDays.date), asc(services.time))
    .limit(10);

  if (rows.length === 0) return null;

  const firstDay = rows[0];
  const dayServices = rows
    .filter((r) => r.dayId === firstDay.dayId && r.serviceId)
    .map((r) => ({
      serviceId: r.serviceId!,
      serviceType: r.serviceType!,
      time: r.time,
    }));

  return {
    id: firstDay.dayId,
    date: firstDay.date,
    cwName: firstDay.cwName,
    colour: firstDay.colour,
    season: firstDay.season,
    services: dayServices,
  };
}

/** Get rota summary for a list of services — count by voice part */
export async function getRotaSummary(serviceIds: string[], churchId: string) {
  if (serviceIds.length === 0) return new Map<string, { total: number; byPart: Record<string, number> }>();

  const entries = await db
    .select({
      serviceId: rotaEntries.serviceId,
      voicePart: churchMemberships.voicePart,
    })
    .from(rotaEntries)
    .innerJoin(churchMemberships, and(
      eq(rotaEntries.userId, churchMemberships.userId),
      eq(churchMemberships.churchId, churchId)
    ))
    .where(inArray(rotaEntries.serviceId, serviceIds));

  const result = new Map<string, { total: number; byPart: Record<string, number> }>();
  for (const sid of serviceIds) {
    result.set(sid, { total: 0, byPart: {} });
  }

  for (const entry of entries) {
    const summary = result.get(entry.serviceId)!;
    summary.total++;
    const part = entry.voicePart || "Unassigned";
    summary.byPart[part] = (summary.byPart[part] || 0) + 1;
  }

  return result;
}

/** Get upcoming days needing attention — no services or zero music slots filled */
export async function getNeedsAttention(churchId: string, limit = 8) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      serviceId: services.id,
      slotCount: sql<number>`count(${musicSlots.id})`.as("slot_count"),
    })
    .from(liturgicalDays)
    .leftJoin(
      services,
      and(
        eq(services.liturgicalDayId, liturgicalDays.id),
        eq(services.churchId, churchId)
      )
    )
    .leftJoin(musicSlots, eq(musicSlots.serviceId, services.id))
    .where(gte(liturgicalDays.date, today))
    .groupBy(liturgicalDays.id, liturgicalDays.date, liturgicalDays.cwName, liturgicalDays.colour, services.id)
    .orderBy(asc(liturgicalDays.date))
    .limit(80);

  // Group all rows per day, then check all services for each day
  const dayRows = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!dayRows.has(row.dayId)) dayRows.set(row.dayId, []);
    dayRows.get(row.dayId)!.push(row);
  }

  interface AttentionItem {
    id: string; date: string; cwName: string; colour: string; reason: string;
  }
  const result: AttentionItem[] = [];

  for (const [dayId, dRows] of dayRows) {
    const first = dRows[0];
    if (!first.serviceId) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No services created" });
      continue;
    }
    const hasEmptyService = dRows.some((r) => r.serviceId && r.slotCount === 0);
    if (hasEmptyService) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No music assigned" });
    }
  }

  return result.slice(0, limit);
}

/** Get music slots for services (for member view) */
export async function getMusicForServices(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, { slotType: string; freeText: string | null }[]>();

  const slots = await db
    .select({
      serviceId: musicSlots.serviceId,
      slotType: musicSlots.slotType,
      freeText: musicSlots.freeText,
    })
    .from(musicSlots)
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));

  const result = new Map<string, { slotType: string; freeText: string | null }[]>();
  for (const slot of slots) {
    if (!result.has(slot.serviceId)) result.set(slot.serviceId, []);
    result.get(slot.serviceId)!.push({ slotType: slot.slotType, freeText: slot.freeText });
  }
  return result;
}

/** Get availability for a specific user across services */
export async function getUserAvailability(userId: string, serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select()
    .from(availability)
    .where(and(eq(availability.userId, userId), inArray(availability.serviceId, serviceIds)));

  const result = new Map<string, string>();
  for (const row of rows) result.set(row.serviceId, row.status);
  return result;
}

/** Get next N upcoming days with their services (for member availability list) */
export async function getUpcomingDaysWithServices(churchId: string, limit = 6) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      serviceId: services.id,
    })
    .from(liturgicalDays)
    .leftJoin(services, and(eq(services.liturgicalDayId, liturgicalDays.id), eq(services.churchId, churchId)))
    .where(gte(liturgicalDays.date, today))
    .orderBy(asc(liturgicalDays.date))
    .limit(limit * 4);

  const dayMap = new Map<string, { id: string; date: string; cwName: string; colour: string; serviceIds: string[] }>();
  for (const row of rows) {
    if (!dayMap.has(row.dayId)) dayMap.set(row.dayId, { id: row.dayId, date: row.date, cwName: row.cwName, colour: row.colour, serviceIds: [] });
    if (row.serviceId) dayMap.get(row.dayId)!.serviceIds.push(row.serviceId);
  }

  return [...dayMap.values()].slice(0, limit);
}
```

- [ ] **Step 2: Verify queries compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/overview.ts
git commit -m "feat: add overview page data queries"
```

---

## Task 5: Overview Page — Loading Skeleton

**Files:**
- Create: `src/app/(app)/churches/[churchId]/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

```tsx
export default function OverviewLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="h-7 w-40 bg-muted animate-pulse mb-1" />
      <div className="h-4 w-64 bg-muted animate-pulse mb-6" />
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 h-28 bg-muted animate-pulse" />
        <div className="flex-1 h-28 bg-muted animate-pulse" />
      </div>
      <div className="h-5 w-36 bg-muted animate-pulse mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/churches/[churchId]/loading.tsx
git commit -m "feat: add loading skeleton for church overview page"
```

---

## Task 6: Overview Page — DoM View Component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/overview-dom.tsx`

Server component for the DoM's view. Uses existing `LITURGICAL_COLOURS` and `SERVICE_TYPE_LABELS`.

- [ ] **Step 1: Create the DoM overview component**

This component renders two sections: service cards with rota summary for "This Sunday", and the "Needs Attention" list. See spec for design details. Key points:
- Voice part gaps shown directly (e.g. "no bass, no tenor")
- Service cards link to the Sunday detail page at `/churches/${churchId}/sundays/${day.date}`
- Attention items link to the same route
- Liturgical colour bar on attention items

Full implementation in `overview-dom.tsx` — imports from `@/types`, `date-fns`, `next/link`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/overview-dom.tsx
git commit -m "feat: add DoM overview components (service cards, needs-attention list)"
```

---

## Task 7: Overview Page — Member View Component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/overview-member.tsx`

Client component. **Reuses the existing `AvailabilityWidget`** from `src/components/availability-widget.tsx` instead of building custom toggles. This ensures consistency with the Sundays page.

- [ ] **Step 1: Create the member overview component**

Key design decisions:
- Uses `AvailabilityWidget` component (already handles POST/DELETE to availability API, optimistic updates, error toasts)
- Music slots shown per service using `MUSIC_SLOT_LABELS` from `@/types`
- "My availability" list shows next 6 Sundays with `AvailabilityWidget` per row
- Skips the first day in the availability list (already shown as "This Sunday")

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/overview-member.tsx
git commit -m "feat: add member overview components (availability, music list)"
```

---

## Task 8: Overview Page — Main Page Component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/page.tsx`

Server component that ties everything together. Uses `requireChurchRole` (same auth pattern as the Sundays page) instead of raw Supabase auth.

- [ ] **Step 1: Create the overview page**

Key points:
- Auth via `requireChurchRole(churchId, "MEMBER")` — same as Sundays page
- Role check: `membership.role === "MEMBER"` for member view, else DoM view
- Fetches data via the query functions from Task 4
- Renders `DomThisSunday` + `NeedsAttention` for DoM, or `MemberThisSunday` + `MyAvailabilityList` for members
- Uses responsive padding `p-4 sm:p-6 lg:p-8 max-w-4xl`

- [ ] **Step 2: Verify the overview page**

Run: `npm run dev`. Navigate to `/churches/[churchId]`. Verify both DoM and member views render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/page.tsx
git commit -m "feat: add church overview page with role-aware DoM and member views"
```

---

## Task 9: Consistency Fixes

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Replace inline inputs on login page**

Add `import { Input } from "@/components/ui/input";` and replace all `<input>` elements with `<Input>` — keep all existing props, add `className="bg-white"`.

- [ ] **Step 2: Replace inline inputs on signup page**

Same pattern for all four input fields (name, email, password, confirm-password).

- [ ] **Step 3: Verify auth pages**

Run: `npm run dev`. Check `/login` and `/signup` — forms should look identical.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/page.tsx
git commit -m "fix: use Input component on auth pages for consistency"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full flow test**

Run: `npm run dev`

1. Log in as single-church admin → redirects to overview
2. Overview: "This Sunday" with service cards and rota summary
3. "Needs attention" list shows incomplete weeks
4. Sidebar: Overview (active), Sundays, Rota | More: Services, Repertoire, Service Sheets | Admin: Members, Settings
5. Click Sundays → list/agenda/calendar views work, days without services show red "No services created"
6. Log in as member → overview shows availability (AvailabilityWidget), music list, "My availability"

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit` — no errors.

- [ ] **Step 3: Build check**

Run: `npm run build` — succeeds.

- [ ] **Step 4: Run existing tests**

Run: `npm test` — all existing tests pass (especially `availability-widget.test.tsx`, `sundays-calendar.test.ts`, `completeness.test.ts`).

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
