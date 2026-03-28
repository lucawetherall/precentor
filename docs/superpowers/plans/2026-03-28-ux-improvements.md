# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three high-impact UX changes — smart entry routing + church overview page, Sundays page redesign with service visibility, and simplified grouped sidebar navigation — plus two consistency fixes.

**Architecture:** Server-first Next.js App Router with Drizzle ORM. New overview page at `/churches/[churchId]` as the index route. Sidebar refactored to accept grouped nav items. Dashboard redirects single-church users directly to their church overview. All queries use existing schema — no migrations needed.

**Tech Stack:** Next.js 16 (App Router), React 19, Drizzle ORM, Supabase Auth, Tailwind CSS 4, shadcn/ui components, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-28-ux-improvements-design.md`

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
| `src/app/(app)/churches/[churchId]/sundays/page.tsx` | Left-join services, show per-row |
| `src/app/(app)/churches/[churchId]/sundays/loading.tsx` | Update responsive padding |
| `src/app/(app)/churches/[churchId]/layout.tsx` | Grouped navItems with section metadata |
| `src/components/church-sidebar.tsx` | Render nav groups with dividers, fix active state for Overview |
| `src/app/(auth)/login/page.tsx` | Replace `<input>` with `Input` component |
| `src/app/(auth)/signup/page.tsx` | Replace `<input>` with `Input` component |
| `src/app/(app)/churches/[churchId]/rota/page.tsx` | Responsive padding fix |
| `src/app/(app)/dashboard/page.tsx` | Responsive padding fix (multi-church users still see this) |

---

## Task 1: Smart Entry Routing on Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx:39-55`

The dashboard already fetches user church memberships. When there is exactly one membership, redirect to the church overview instead of rendering the full dashboard.

- [ ] **Step 1: Add redirect for single-church users**

In `src/app/(app)/dashboard/page.tsx`, after the memberships query (line 54), add a redirect before the page renders. The existing code already checks `memberships.length === 0` and redirects to `/onboarding`. Add the single-church redirect right after:

```tsx
// After line 54: userChurches = memberships;
// Add:
if (userChurches.length === 1) {
  redirect(`/churches/${userChurches[0].churchId}`);
}
```

`redirect` is already imported from `next/navigation` on line 2.

- [ ] **Step 2: Update church card links for multi-church case**

In the same file, the "Your Churches" section (line 224-237) links each church to `/churches/${uc.churchId}/sundays`. Update to link to the overview instead:

```tsx
// Line 227: change href
href={`/churches/${uc.churchId}`}
```

Also update the quick action links (lines 123, 135, 147) — these still make sense for multi-church users as shortcuts, but the main church card should go to overview.

- [ ] **Step 3: Verify the redirect works**

Run: `npm run dev`

Test: Log in with a user that belongs to one church. After login, you should land on `/churches/[churchId]` (which will 404 for now — that's expected). Log in with a user that belongs to multiple churches — you should see the dashboard as before.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: redirect single-church users to church overview from dashboard"
```

---

## Task 2: Sidebar Restructure — Grouped Navigation

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/layout.tsx:57-66`
- Modify: `src/components/church-sidebar.tsx`

### Step-by-step

- [ ] **Step 1: Update navItems structure in layout.tsx**

Replace the current flat `navItems` array (lines 57-66) with a grouped structure:

```tsx
interface NavGroup {
  label?: string; // undefined = primary (no header)
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

Update the `ChurchSidebar` prop from `navItems` to `navGroups`. Pass `navGroups` instead.

- [ ] **Step 2: Rewrite church-sidebar.tsx to render groups**

Replace the entire `church-sidebar.tsx` with the grouped version. Key changes:

1. Import `Home` from lucide-react and add to `iconMap`.
2. Change the `NavItem` interface to include `exactMatch?: boolean`.
3. Create a new `NavGroup` interface matching the layout.
4. Update `NavLinks` to accept `NavGroup[]` and render with dividers:

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
              const isMuted = !!group.label; // secondary/admin sections use muted text
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
  churchId,
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
      {/* Mobile top bar */}
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

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar p-4 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
```

Note: "All Churches" back link is removed. The `navItems` prop is renamed to `navGroups`.

- [ ] **Step 3: Verify sidebar renders correctly**

Run: `npm run dev`

Navigate to any church page. Confirm:
- Overview, Sundays, Rota appear as primary items
- A divider and "More" label appear before Repertoire and Service Sheets
- For admin users, a second divider and "Admin" label appear before Members and Settings
- For member users, the Admin section is absent
- Clicking Overview (while on the Sundays page) does NOT highlight Overview in the sidebar
- Clicking Overview navigates to `/churches/[churchId]` (404 for now — expected)

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/layout.tsx src/components/church-sidebar.tsx
git commit -m "feat: restructure sidebar with grouped navigation and Overview link"
```

---

## Task 3: Sundays Page Redesign — Services Per Row

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/sundays/page.tsx`
- Modify: `src/app/(app)/churches/[churchId]/sundays/loading.tsx`

- [ ] **Step 1: Update the Sundays page query to join services**

Replace the entire `sundays/page.tsx`. The key change is a left join from `liturgicalDays` to `services` filtered by churchId in the ON clause, then grouping results by liturgical day:

```tsx
import { db } from "@/lib/db";
import { liturgicalDays, services } from "@/lib/db/schema";
import { gte, asc, eq, and, sql } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from "@/types";
import type { LiturgicalColour, ServiceType } from "@/types";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function SundaysPage({ params }: Props) {
  const { churchId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");

  interface DayWithServices {
    id: string;
    date: string;
    cwName: string;
    colour: string;
    season: string;
    services: { serviceType: string; time: string | null }[];
  }

  let upcomingDays: DayWithServices[] = [];

  try {
    const rows = await db
      .select({
        dayId: liturgicalDays.id,
        date: liturgicalDays.date,
        cwName: liturgicalDays.cwName,
        colour: liturgicalDays.colour,
        season: liturgicalDays.season,
        serviceType: services.serviceType,
        serviceTime: services.time,
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
      .limit(60); // Allow for multiple services per day

    // Group rows by liturgical day
    const dayMap = new Map<string, DayWithServices>();
    for (const row of rows) {
      if (!dayMap.has(row.dayId)) {
        dayMap.set(row.dayId, {
          id: row.dayId,
          date: row.date,
          cwName: row.cwName,
          colour: row.colour,
          season: row.season,
          services: [],
        });
      }
      if (row.serviceType) {
        dayMap.get(row.dayId)!.services.push({
          serviceType: row.serviceType,
          time: row.serviceTime,
        });
      }
    }
    upcomingDays = [...dayMap.values()].slice(0, 20);
  } catch { /* DB not available */ }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Upcoming Sundays</h1>

      {upcomingDays.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No liturgical calendar data available. Run the database seed to populate the calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingDays.map((day) => (
            <Link
              key={day.id}
              href={`/churches/${churchId}/sundays/${day.date}`}
              className="flex items-stretch border border-border bg-card shadow-sm hover:border-primary transition-colors"
            >
              <span
                aria-hidden="true"
                className="w-1 flex-shrink-0"
                style={{
                  backgroundColor: LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? "#4A6741",
                }}
              />
              <div className="flex-1 p-3 sm:p-4 flex items-center gap-4">
                <div className="min-w-[100px]">
                  <p className="font-mono text-xs text-muted-foreground">
                    {format(parseISO(day.date), "EEE d MMM")}
                  </p>
                  <p className="font-heading text-base font-semibold leading-tight">
                    {day.cwName}
                  </p>
                </div>
                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
                  {day.services.length > 0 ? (
                    day.services.map((s, i) => (
                      <span key={i} className="text-xs text-foreground">
                        {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                        {s.time && <span className="text-muted-foreground ml-1">{s.time}</span>}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-destructive italic">No services created</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 hidden sm:block">
                  {day.season.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update the loading skeleton for responsive padding**

Update `src/app/(app)/churches/[churchId]/sundays/loading.tsx`:

```tsx
export default function SundaysLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="h-8 w-64 bg-muted animate-pulse mb-6" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the redesigned Sundays page**

Run: `npm run dev`

Navigate to `/churches/[churchId]/sundays`. Confirm:
- Each row shows the liturgical colour bar, date, name, and any services for that day
- Days without services show "No services created" in red italic
- Days with services show type + time (e.g. "Sung Eucharist 10:00")
- The page uses responsive padding (`p-4 sm:p-6 lg:p-8`)

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/sundays/page.tsx src/app/(app)/churches/[churchId]/sundays/loading.tsx
git commit -m "feat: show services per row on Sundays page with empty state indicator"
```

---

## Task 4: Overview Page — Data Queries

**Files:**
- Create: `src/lib/db/queries/overview.ts`

This task creates the data-fetching functions the overview page needs. Isolated from the UI so it can be tested and reused.

- [ ] **Step 1: Create the queries file**

Create the `src/lib/db/queries/` directory if it does not exist.

```tsx
import { db } from "@/lib/db";
import {
  liturgicalDays, services, musicSlots, availability,
  rotaEntries, churchMemberships,
} from "@/lib/db/schema";
import { eq, and, gte, asc, inArray, sql, count } from "drizzle-orm";
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
    .limit(10); // First day may have multiple services

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

/** Get upcoming days that need attention — no services or zero music slots filled */
export async function getNeedsAttention(churchId: string, limit = 8) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Get upcoming days with service + music slot counts
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
    .limit(80); // Generous limit to find enough attention items

  // Group by day: collect all service rows per day, then determine attention status
  const dayRows = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!dayRows.has(row.dayId)) dayRows.set(row.dayId, []);
    dayRows.get(row.dayId)!.push(row);
  }

  interface AttentionItem {
    id: string;
    date: string;
    cwName: string;
    colour: string;
    reason: string;
  }
  const result: AttentionItem[] = [];

  for (const [dayId, dRows] of dayRows) {
    const first = dRows[0];

    // Case (a): no services at all for this day
    if (!first.serviceId) {
      result.push({
        id: dayId,
        date: first.date,
        cwName: first.cwName,
        colour: first.colour,
        reason: "No services created",
      });
      continue;
    }

    // Case (b): any service has zero music slots filled
    const hasEmptyService = dRows.some((r) => r.serviceId && r.slotCount === 0);
    if (hasEmptyService) {
      result.push({
        id: dayId,
        date: first.date,
        cwName: first.cwName,
        colour: first.colour,
        reason: "No music assigned",
      });
    }
  }

  return result.slice(0, limit);
}

/** Get music slots for a list of services (for member view — show what music is planned) */
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

/** Get availability for a specific user across a list of services */
export async function getUserAvailability(userId: string, serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select()
    .from(availability)
    .where(and(
      eq(availability.userId, userId),
      inArray(availability.serviceId, serviceIds)
    ));

  const result = new Map<string, string>();
  for (const row of rows) {
    result.set(row.serviceId, row.status);
  }
  return result;
}

/** Get next N upcoming liturgical days with their services (for member availability list) */
export async function getUpcomingDaysWithServices(churchId: string, limit = 6) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
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
    .limit(limit * 4); // Account for multiple services per day

  const dayMap = new Map<string, {
    id: string;
    date: string;
    cwName: string;
    colour: string;
    serviceIds: string[];
  }>();

  for (const row of rows) {
    if (!dayMap.has(row.dayId)) {
      dayMap.set(row.dayId, {
        id: row.dayId,
        date: row.date,
        cwName: row.cwName,
        colour: row.colour,
        serviceIds: [],
      });
    }
    if (row.serviceId) {
      dayMap.get(row.dayId)!.serviceIds.push(row.serviceId);
    }
  }

  return [...dayMap.values()].slice(0, limit);
}
```

- [ ] **Step 2: Verify queries compile**

Run: `npx tsc --noEmit`

Expected: No type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/queries/overview.ts
git commit -m "feat: add overview page data queries (this-sunday, rota summary, needs-attention)"
```

---

## Task 5: Overview Page — Loading Skeleton

**Files:**
- Create: `src/app/(app)/churches/[churchId]/loading.tsx`

- [ ] **Step 1: Create the loading skeleton**

Follow the pattern from `sundays/loading.tsx`:

```tsx
export default function OverviewLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* This Sunday header */}
      <div className="h-7 w-40 bg-muted animate-pulse mb-1" />
      <div className="h-4 w-64 bg-muted animate-pulse mb-6" />

      {/* Service cards */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 h-28 bg-muted animate-pulse" />
        <div className="flex-1 h-28 bg-muted animate-pulse" />
      </div>

      {/* Section header */}
      <div className="h-5 w-36 bg-muted animate-pulse mb-3" />

      {/* Attention/availability rows */}
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

This is a server component showing the DoM's view: service cards with rota summary, and the "needs attention" list.

- [ ] **Step 1: Create the DoM overview component**

```tsx
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from "@/types";
import type { LiturgicalColour, ServiceType } from "@/types";

const VOICE_PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"] as const;

interface ServiceCard {
  serviceId: string;
  serviceType: string;
  time: string | null;
}

interface RotaSummary {
  total: number;
  byPart: Record<string, number>;
}

interface AttentionItem {
  id: string;
  date: string;
  cwName: string;
  colour: string;
  reason: string;
}

export function DomThisSunday({
  churchId,
  day,
  services,
  rotaSummaries,
}: {
  churchId: string;
  day: { date: string; cwName: string; colour: string; season: string };
  services: ServiceCard[];
  rotaSummaries: Map<string, RotaSummary>;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-3">
        {services.map((s) => {
          const summary = rotaSummaries.get(s.serviceId);
          const missingParts = VOICE_PARTS.filter(
            (p) => !summary?.byPart[p]
          );

          return (
            <Link
              key={s.serviceId}
              href={`/churches/${churchId}/sundays/${day.date}`}
              className="flex-1 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-heading text-base font-semibold">
                  {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                </span>
                {s.time && (
                  <span className="text-xs text-muted-foreground">{s.time}</span>
                )}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  {summary.total} on rota
                  {missingParts.length > 0 && (
                    <span className="text-destructive">
                      {" "}· no {missingParts.map((p) => p.toLowerCase()).join(", ")}
                    </span>
                  )}
                </p>
              )}
              {!summary && (
                <p className="text-xs text-muted-foreground">No rota data</p>
              )}
            </Link>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No services created for this Sunday.{" "}
            <Link
              href={`/churches/${churchId}/sundays/${day.date}`}
              className="text-primary underline"
            >
              Plan services
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export function NeedsAttention({
  churchId,
  items,
}: {
  churchId: string;
  items: AttentionItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold mb-3">Needs attention</h2>
      <div className="border border-border bg-card divide-y divide-border">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/churches/${churchId}/sundays/${item.date}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span
              aria-hidden="true"
              className="w-1 h-6 flex-shrink-0"
              style={{
                backgroundColor:
                  LITURGICAL_COLOURS[item.colour as LiturgicalColour] ?? "#4A6741",
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">
                {format(parseISO(item.date), "d MMM")} — {item.cwName}
              </span>
            </div>
            <span className="text-xs text-destructive flex-shrink-0">
              {item.reason}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

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

Client component for the member view — availability toggles and upcoming music.

- [ ] **Step 1: Create the member overview component**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Check, X, Minus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { LITURGICAL_COLOURS, MUSIC_SLOT_LABELS, SERVICE_TYPE_LABELS } from "@/types";
import type { LiturgicalColour, MusicSlotType, ServiceType } from "@/types";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";

interface ServiceWithMusic {
  serviceId: string;
  serviceType: string;
  time: string | null;
  musicSlots: { slotType: string; freeText: string | null }[];
}

interface UpcomingDay {
  id: string;
  date: string;
  cwName: string;
  colour: string;
  serviceIds: string[];
}

export function MemberThisSunday({
  churchId,
  day,
  services,
  initialAvailability,
}: {
  churchId: string;
  day: { date: string; cwName: string };
  services: ServiceWithMusic[];
  initialAvailability: Record<string, AvailabilityStatus>;
}) {
  const [avail, setAvail] = useState(initialAvailability);
  const { addToast } = useToast();

  const setStatus = async (serviceId: string, status: AvailabilityStatus) => {
    const current = avail[serviceId];
    setAvail((prev) => ({ ...prev, [serviceId]: status }));

    try {
      const res = await fetch(`/api/churches/${churchId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, status }),
      });
      if (!res.ok) {
        setAvail((prev) => ({ ...prev, [serviceId]: current }));
        addToast("Failed to update availability", "error");
      }
    } catch {
      setAvail((prev) => ({ ...prev, [serviceId]: current }));
      addToast("Network error", "error");
    }
  };

  // Note: userId is intentionally omitted from the API payload. The availability
  // API falls back to the authenticated user's ID when userId is absent.
  // Members can only set their own availability, so this is correct.

  return (
    <div className="mb-8 space-y-2">
      {services.map((s) => {
        const status = avail[s.serviceId] || "AVAILABLE";
        return (
          <div key={s.serviceId} className="border border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-heading text-base font-semibold">
                  {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                </span>
                {s.time && (
                  <span className="text-xs text-muted-foreground ml-2">{s.time}</span>
                )}
              </div>
              {/* Availability toggle — clicking a button sets that exact status */}
              <div className="flex gap-0.5" role="group" aria-label="Your availability">
                {(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"] as const).map((st) => {
                  const isActive = status === st;
                  const Icon = st === "AVAILABLE" ? Check : st === "UNAVAILABLE" ? X : Minus;
                  const activeClass =
                    st === "AVAILABLE" ? "border-success text-success" :
                    st === "UNAVAILABLE" ? "border-destructive text-destructive" :
                    "border-warning text-warning";
                  return (
                    <button
                      key={st}
                      onClick={() => setStatus(s.serviceId, st)}
                      aria-pressed={isActive}
                      aria-label={st.charAt(0) + st.slice(1).toLowerCase()}
                      className={`w-7 h-7 flex items-center justify-center border transition-colors ${
                        isActive ? activeClass : "border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Music list */}
            {s.musicSlots.length > 0 && (
              <div className="space-y-1">
                {s.musicSlots.map((slot, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-mono text-muted-foreground uppercase tracking-wider min-w-[70px]">
                      {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] || slot.slotType}
                    </span>
                    <span className="text-foreground">
                      {slot.freeText || <span className="text-muted-foreground italic">Not yet chosen</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {services.length === 0 && (
        <div className="border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No services planned for this Sunday yet.</p>
        </div>
      )}
    </div>
  );
}

export function MyAvailabilityList({
  churchId,
  days,
  initialAvailability,
}: {
  churchId: string;
  days: UpcomingDay[];
  initialAvailability: Record<string, AvailabilityStatus>;
}) {
  const [avail, setAvail] = useState(initialAvailability);
  const { addToast } = useToast();

  const setStatus = async (serviceId: string, status: AvailabilityStatus) => {
    const current = avail[serviceId];
    setAvail((prev) => ({ ...prev, [serviceId]: status }));

    try {
      const res = await fetch(`/api/churches/${churchId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, status }),
      });
      if (!res.ok) {
        setAvail((prev) => ({ ...prev, [serviceId]: current }));
        addToast("Failed to update availability", "error");
      }
    } catch {
      setAvail((prev) => ({ ...prev, [serviceId]: current }));
      addToast("Network error", "error");
    }
  };

  // Skip the first day (already shown in "This Sunday")
  const remainingDays = days.slice(1);
  if (remainingDays.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold mb-3">My availability</h2>
      <div className="border border-border bg-card divide-y divide-border">
        {remainingDays.map((day) => (
          <div key={day.id} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="w-1 h-6 flex-shrink-0"
              style={{
                backgroundColor:
                  LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? "#4A6741",
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">
                {format(parseISO(day.date), "d MMM")} — {day.cwName}
              </span>
            </div>
            {day.serviceIds.length > 0 ? (
              <div className="flex gap-0.5" role="group" aria-label={`Availability for ${day.cwName}`}>
                {(["AVAILABLE", "TENTATIVE", "UNAVAILABLE"] as const).map((st) => {
                  // Use first service ID as the availability key for simplicity
                  const sid = day.serviceIds[0];
                  const isActive = avail[sid] === st;
                  const Icon = st === "AVAILABLE" ? Check : st === "UNAVAILABLE" ? X : Minus;
                  const activeClass =
                    st === "AVAILABLE" ? "border-success text-success" :
                    st === "UNAVAILABLE" ? "border-destructive text-destructive" :
                    "border-warning text-warning";
                  return (
                    <button
                      key={st}
                      onClick={() => setStatus(sid, st)}
                      aria-pressed={isActive}
                      aria-label={st.charAt(0) + st.slice(1).toLowerCase()}
                      className={`w-6 h-6 flex items-center justify-center border transition-colors ${
                        isActive ? activeClass : "border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">No services</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/overview-member.tsx
git commit -m "feat: add member overview components (availability toggles, music list)"
```

---

## Task 8: Overview Page — Main Page Component

**Files:**
- Create: `src/app/(app)/churches/[churchId]/page.tsx`

This server component ties everything together — fetches data and renders the appropriate view based on role.

- [ ] **Step 1: Create the overview page**

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  getThisSunday,
  getRotaSummary,
  getNeedsAttention,
  getMusicForServices,
  getUserAvailability,
  getUpcomingDaysWithServices,
} from "@/lib/db/queries/overview";
import { DomThisSunday, NeedsAttention } from "./overview-dom";
import { MemberThisSunday, MyAvailabilityList } from "./overview-member";
import { LITURGICAL_COLOURS } from "@/types";
import type { LiturgicalColour } from "@/types";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ChurchOverviewPage({ params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's role for this church
  let userRole = "MEMBER";
  let dbUserId = "";
  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length > 0) {
      dbUserId = dbUser[0].id;
      const membership = await db
        .select()
        .from(churchMemberships)
        .where(and(eq(churchMemberships.userId, dbUser[0].id), eq(churchMemberships.churchId, churchId)))
        .limit(1);
      if (membership.length > 0) userRole = membership[0].role;
    }
  } catch { /* DB not available */ }

  const isMember = userRole === "MEMBER";

  // Fetch "This Sunday" data
  let thisSunday: Awaited<ReturnType<typeof getThisSunday>> = null;
  try {
    thisSunday = await getThisSunday(churchId);
  } catch { /* DB not available */ }

  const serviceIds = thisSunday?.services.map((s) => s.serviceId) || [];

  if (isMember) {
    // ── Member view ──
    let musicByService = new Map<string, { slotType: string; freeText: string | null }[]>();
    let userAvail = new Map<string, string>();
    let upcomingDays: Awaited<ReturnType<typeof getUpcomingDaysWithServices>> = [];

    try {
      [musicByService, upcomingDays] = await Promise.all([
        getMusicForServices(serviceIds),
        getUpcomingDaysWithServices(churchId, 7), // 7 to have 6 after slicing first
      ]);

      // Get availability for all service IDs across upcoming days
      const allServiceIds = [
        ...serviceIds,
        ...upcomingDays.flatMap((d) => d.serviceIds),
      ];
      const uniqueServiceIds = [...new Set(allServiceIds)];
      userAvail = await getUserAvailability(dbUserId, uniqueServiceIds);
    } catch { /* DB not available */ }

    const initialAvail: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE"> = {};
    for (const [sid, status] of userAvail) {
      initialAvail[sid] = status as "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";
    }

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        {thisSunday ? (
          <>
            <h1 className="font-heading text-2xl font-semibold mb-1">This Sunday</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-6">
              {format(parseISO(thisSunday.date), "d MMM yyyy")} · {thisSunday.cwName}
            </p>
            <MemberThisSunday
              churchId={churchId}
              day={thisSunday}
              services={thisSunday.services.map((s) => ({
                ...s,
                musicSlots: musicByService.get(s.serviceId) || [],
              }))}
              initialAvailability={initialAvail}
            />
          </>
        ) : (
          <div className="border border-border bg-card p-8 text-center mb-8">
            <p className="text-muted-foreground">No upcoming liturgical days found.</p>
          </div>
        )}

        <MyAvailabilityList
          churchId={churchId}
          days={upcomingDays}
          initialAvailability={initialAvail}
        />
      </div>
    );
  }

  // ── DoM view (ADMIN / EDITOR) ──
  let rotaSummaries = new Map<string, { total: number; byPart: Record<string, number> }>();
  let attentionItems: Awaited<ReturnType<typeof getNeedsAttention>> = [];

  try {
    [rotaSummaries, attentionItems] = await Promise.all([
      getRotaSummary(serviceIds, churchId),
      getNeedsAttention(churchId),
    ]);
  } catch { /* DB not available */ }

  // Exclude "this Sunday" from the attention list (it's already shown as hero)
  const filteredAttention = attentionItems.filter(
    (item) => item.id !== thisSunday?.id
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      {thisSunday ? (
        <>
          <h1 className="font-heading text-2xl font-semibold mb-1">This Sunday</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-6">
            {format(parseISO(thisSunday.date), "d MMM yyyy")} · {thisSunday.cwName}
          </p>
          <DomThisSunday
            churchId={churchId}
            day={thisSunday}
            services={thisSunday.services}
            rotaSummaries={rotaSummaries}
          />
        </>
      ) : (
        <div className="border border-border bg-card p-8 text-center mb-8">
          <p className="text-muted-foreground">No upcoming liturgical days found.</p>
        </div>
      )}

      <NeedsAttention churchId={churchId} items={filteredAttention} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the full overview page works**

Run: `npm run dev`

Test as an admin user: navigate to `/churches/[churchId]`. Confirm:
- "This Sunday" header shows with date and liturgical day name
- Service cards show service type, time, and rota summary
- "Needs attention" list shows upcoming Sundays missing services or music
- Clicking a service card or attention item navigates to the Sunday detail page

Test as a member user:
- "This Sunday" shows service cards with availability toggles
- Music slots listed per service
- "My availability" section shows upcoming weeks with toggles

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
- Modify: `src/app/(app)/churches/[churchId]/rota/page.tsx`

- [ ] **Step 1: Replace inline inputs on login page**

In `src/app/(auth)/login/page.tsx`, add the import and replace the two `<input>` elements:

Add import at top:
```tsx
import { Input } from "@/components/ui/input";
```

Replace line 50-58 (email input):
```tsx
<Input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="director@parish.org.uk"
  required
  className="bg-white"
/>
```

Replace line 68-76 (password input):
```tsx
<Input
  id="password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Enter your password"
  required
  className="bg-white"
/>
```

- [ ] **Step 2: Replace inline inputs on signup page**

In `src/app/(auth)/signup/page.tsx`, add the same import and replace all four `<input>` elements (name, email, password, confirm-password) with `<Input>` using the same pattern — keep all existing props, add `className="bg-white"`.

- [ ] **Step 3: Fix responsive padding on rota page and dashboard**

In `src/app/(app)/churches/[churchId]/rota/page.tsx`, line 72:

Change: `<div className="p-8">`
To: `<div className="p-4 sm:p-6 lg:p-8">`

In `src/app/(app)/dashboard/page.tsx`, line 110:

Change: `<main id="main-content" className="p-8 max-w-4xl">`
To: `<main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-4xl">`

- [ ] **Step 4: Verify auth pages and rota page**

Run: `npm run dev`

- Navigate to `/login` — form should look identical (the Input component produces nearly the same styles)
- Navigate to `/signup` — same check
- Navigate to a church's rota page on a narrow viewport — padding should now be responsive

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/page.tsx src/app/(app)/churches/[churchId]/rota/page.tsx src/app/(app)/dashboard/page.tsx
git commit -m "fix: use Input component on auth pages, add responsive padding to rota and dashboard"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full flow test**

Run: `npm run dev`

Test the complete user journey:
1. Log in as a single-church admin → should redirect to `/churches/[id]` (overview)
2. Overview shows "This Sunday" with service cards and rota summary
3. "Needs attention" list shows Sundays missing services/music
4. Sidebar shows Overview (active), Sundays, Rota, then More section, then Admin section
5. Click Sundays → rows show services per day, "No services created" in red for empty weeks
6. Back to Overview via sidebar
7. Log in as a member → overview shows availability toggles, music list, "My availability"

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Build check**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit any final adjustments**

If any fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix: address issues found during final verification"
```
