# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three high-impact UX changes — smart entry routing + church overview page, "no services" empty-state indicators, and simplified grouped sidebar navigation — plus consistency fixes.

**Architecture:** Server-first Next.js App Router with Drizzle ORM. New overview page at `/churches/[churchId]` as the index route. Sidebar refactored to accept grouped nav items. Dashboard redirects single-church users directly to their church overview. All queries use existing schema — no migrations needed.

**Tech Stack:** Next.js 16 (App Router), React 19, Drizzle ORM, Supabase Auth, Tailwind CSS 4, shadcn/ui components, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-28-ux-improvements-design.md`

**Important codebase context (from recent PRs #27-29):**
- The `/sundays` route uses a multi-view wrapper (`SundaysViewWrapper`) with list/agenda/calendar views and already joins services + availability per liturgical day. The `/services` route is the DoM's planning page with completeness dots. Both exist; only "Services" appears in nav.
- A reusable `AvailabilityWidget` component exists at `src/components/availability-widget.tsx`
- The nav already says "Services" (not "Sundays") — all user-facing labels use "Services"
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
| `src/app/(app)/churches/[churchId]/services/page.tsx` | Add "No services created" indicator + responsive padding |
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

In `src/app/(app)/dashboard/page.tsx`, add the redirect immediately after `userChurches = memberships` (line 51) and BEFORE the upcoming services fetch loop (line 71+). This avoids wasting DB queries for single-church users who will be redirected anyway:

```tsx
userChurches = memberships;
// Redirect single-church users straight to their church overview
if (userChurches.length === 1) {
  redirect(`/churches/${userChurches[0].churchId}`);
}
```

`redirect` is already imported from `next/navigation`. Place this inside the existing try/catch, right after `userChurches = memberships` on line 51.

- [ ] **Step 2: Update church card links for multi-church case**

In the "Your Churches" section, church cards currently link to `/churches/${uc.churchId}/sundays` (line 223). Update to link to the overview:

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

Replace the current flat `navItems` array with a grouped structure. The primary nav item is "Services" (the DoM's planning page at `/services` with completeness dots). "Sundays" (the member-facing calendar/list/agenda at `/sundays`) moves to secondary:

```tsx
interface NavGroup {
  label?: string;
  items: { href: string; label: string; iconName: string; exactMatch?: boolean }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: `/churches/${churchId}`, label: "Overview", iconName: "Home", exactMatch: true },
      { href: `/churches/${churchId}/services`, label: "Services", iconName: "Calendar" },
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

Note: Templates is absorbed into Settings (it's already a sub-route at `/settings/templates`). "Sundays" is no longer a nav item — the `/sundays` route is deprecated in favour of the new Overview page. All user-facing navigation uses "Services".

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

## Task 3: "No Services Created" Indicator on Services Page

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx`

The Services page lists upcoming liturgical days with completeness dots per service. When no services have been created for a day, there's currently no visual indicator — the row just shows no dots. We need a "No services created" callout in red italic.

Note: The `/sundays` route is deprecated (replaced by the Overview page) and does not need updating.

- [ ] **Step 1: Update Services page for empty days**

In `src/app/(app)/churches/[churchId]/services/page.tsx`, the completeness dots section (around line 100) only renders when `dayServices.length > 0`. After the completeness dots block, add a fallback for empty days:

```tsx
{dayServices.length === 0 && (
  <span className="text-xs text-destructive italic flex-shrink-0">No services created</span>
)}
```

Also update this page's responsive padding: change `className="p-8 max-w-4xl"` to `className="p-4 sm:p-6 lg:p-8 max-w-4xl"`.

- [ ] **Step 2: Verify**

Run: `npm run dev`. Navigate to `/services`. Days without services should show "No services created" in red. Days with services show completeness dots as before.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/page.tsx
git commit -m "feat: show 'No services created' indicator on Services page"
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
  rotaEntries, churchMemberships, hymns, anthems,
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

/** Get upcoming days needing attention — no services or no music content assigned.
 *
 * IMPORTANT: Services created from templates already have musicSlot rows
 * (one per template section). A non-zero slot count does NOT mean music has been
 * assigned. We must check whether any slot has actual content (hymnId, anthemId,
 * freeText, massSettingId, canticleSettingId, or responsesSettingId).
 */
export async function getNeedsAttention(churchId: string, limit = 8) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Step 1: Get upcoming days with their services
  const dayServiceRows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      serviceId: services.id,
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
    .orderBy(asc(liturgicalDays.date))
    .limit(60);

  // Collect all service IDs that exist
  const serviceIds = dayServiceRows
    .filter((r) => r.serviceId !== null)
    .map((r) => r.serviceId!);

  // Step 2: For services that exist, count slots with actual content assigned
  let filledSlotCounts = new Map<string, number>();
  if (serviceIds.length > 0) {
    const slotRows = await db
      .select({
        serviceId: musicSlots.serviceId,
        filledCount: sql<number>`count(case when ${musicSlots.hymnId} is not null or ${musicSlots.anthemId} is not null or ${musicSlots.freeText} is not null or ${musicSlots.massSettingId} is not null or ${musicSlots.canticleSettingId} is not null or ${musicSlots.responsesSettingId} is not null then 1 end)`.as("filled_count"),
      })
      .from(musicSlots)
      .where(inArray(musicSlots.serviceId, serviceIds))
      .groupBy(musicSlots.serviceId);

    for (const row of slotRows) {
      filledSlotCounts.set(row.serviceId, row.filledCount);
    }
  }

  // Step 3: Group by day and determine attention status
  const dayMap = new Map<string, typeof dayServiceRows>();
  for (const row of dayServiceRows) {
    if (!dayMap.has(row.dayId)) dayMap.set(row.dayId, []);
    dayMap.get(row.dayId)!.push(row);
  }

  interface AttentionItem {
    id: string; date: string; cwName: string; colour: string; reason: string;
  }
  const result: AttentionItem[] = [];

  for (const [dayId, dRows] of dayMap) {
    const first = dRows[0];
    if (!first.serviceId) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No services created" });
      continue;
    }
    // Check if ANY service for this day has zero filled music slots
    const hasEmptyService = dRows.some((r) => {
      if (!r.serviceId) return false;
      const filled = filledSlotCounts.get(r.serviceId) ?? 0;
      return filled === 0;
    });
    if (hasEmptyService) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No music assigned" });
    }
  }

  return result.slice(0, limit);
}

/** Get music slots for services with resolved hymn/anthem names (for member view).
 * Follows the same join pattern as the Sundays page query. */
export async function getMusicForServices(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, { slotType: string; title: string }[]>();

  const slots = await db
    .select({
      serviceId: musicSlots.serviceId,
      slotType: musicSlots.slotType,
      freeText: musicSlots.freeText,
      hymnFirstLine: hymns.firstLine,
      anthemTitle: anthems.title,
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));

  const result = new Map<string, { slotType: string; title: string }[]>();
  for (const slot of slots) {
    // Only include slots that have content assigned
    const title = slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText;
    if (!title) continue;
    if (!result.has(slot.serviceId)) result.set(slot.serviceId, []);
    result.get(slot.serviceId)!.push({ slotType: slot.slotType, title });
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
              href={`/churches/${churchId}/services/${day.date}`}
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
              href={`/churches/${churchId}/services/${day.date}`}
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
            href={`/churches/${churchId}/services/${item.date}`}
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

Note: All DoM links go to `/services/${day.date}` (the editor page), NOT `/sundays/${day.date}`.

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

```tsx
"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import { LITURGICAL_COLOURS, MUSIC_SLOT_LABELS } from "@/types";
import type { LiturgicalColour, MusicSlotType } from "@/types";
import { AvailabilityWidget } from "@/components/availability-widget";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";

interface ServiceWithMusic {
  serviceId: string;
  serviceType: string;
  time: string | null;
  musicSlots: { slotType: string; title: string }[];
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
  userAvailability,
}: {
  churchId: string;
  day: { date: string; cwName: string };
  services: ServiceWithMusic[];
  userAvailability: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null>;
}) {
  return (
    <div className="mb-8 space-y-2">
      {services.map((s) => (
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
            {/* Reuse AvailabilityWidget — handles API, optimistic updates, error toasts */}
            <AvailabilityWidget
              serviceId={s.serviceId}
              churchId={churchId}
              currentStatus={userAvailability[s.serviceId] ?? null}
              size="md"
            />
          </div>

          {/* Music list */}
          {s.musicSlots.length > 0 ? (
            <div className="space-y-1 mb-3">
              {s.musicSlots.map((slot, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="font-mono text-muted-foreground uppercase tracking-wider min-w-[70px]">
                    {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] || slot.slotType}
                  </span>
                  <span className="text-foreground">{slot.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-3">Music not yet planned</p>
          )}

          {/* Service sheet download link */}
          <div className="pt-3 border-t border-border">
            <a
              href={`/api/churches/${churchId}/services/${s.serviceId}/sheet?format=pdf`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              Download service sheet
            </a>
          </div>
        </div>
      ))}

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
  userAvailability,
}: {
  churchId: string;
  days: UpcomingDay[];
  userAvailability: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null>;
}) {
  // Skip the first day (already shown in "This Sunday" hero)
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
              <AvailabilityWidget
                serviceId={day.serviceIds[0]}
                churchId={churchId}
                currentStatus={userAvailability[day.serviceIds[0]] ?? null}
                size="sm"
              />
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

Key design decisions:
- **Reuses `AvailabilityWidget`** (handles POST/DELETE, optimistic updates, error toasts — no custom toggle code)
- **Music slots use resolved titles** from the `getMusicForServices` query (hymn names, anthem titles)
- **Service sheet download link** on each service card — links directly to the sheet API (`/api/churches/${churchId}/services/${serviceId}/sheet?format=pdf`)
- **"My availability" list** uses `AvailabilityWidget` at `sm` size for compact display
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

```tsx
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
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

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ChurchOverviewPage({ params }: Props) {
  const { churchId } = await params;
  const { user, membership, error } = await requireChurchRole(churchId, "MEMBER");
  if (error) redirect("/login");

  const isMember = membership!.role === "MEMBER";
  const userId = user!.id;

  // Fetch "This Sunday" data
  let thisSunday: Awaited<ReturnType<typeof getThisSunday>> = null;
  try {
    thisSunday = await getThisSunday(churchId);
  } catch { /* DB not available */ }

  // Empty state — no liturgical data at all
  if (!thisSunday) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No liturgical calendar data available. Run the database seed to populate the calendar.
          </p>
        </div>
      </div>
    );
  }

  const serviceIds = thisSunday.services.map((s) => s.serviceId);

  if (isMember) {
    // ── Member view ──
    let musicByService = new Map<string, { slotType: string; title: string }[]>();
    let userAvail = new Map<string, string>();
    let upcomingDays: Awaited<ReturnType<typeof getUpcomingDaysWithServices>> = [];

    try {
      [musicByService, upcomingDays] = await Promise.all([
        getMusicForServices(serviceIds),
        getUpcomingDaysWithServices(churchId, 7),
      ]);

      const allServiceIds = [
        ...serviceIds,
        ...upcomingDays.flatMap((d) => d.serviceIds),
      ];
      const uniqueServiceIds = [...new Set(allServiceIds)];
      userAvail = await getUserAvailability(userId, uniqueServiceIds);
    } catch { /* DB not available */ }

    const initialAvail: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null> = {};
    for (const [sid, status] of userAvail) {
      initialAvail[sid] = status as "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";
    }

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
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
          userAvailability={initialAvail}
        />
        <MyAvailabilityList
          churchId={churchId}
          days={upcomingDays}
          userAvailability={initialAvail}
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

  // Exclude "this Sunday" from the attention list (already shown as hero)
  const filteredAttention = attentionItems.filter(
    (item) => item.id !== thisSunday?.id
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
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
      <NeedsAttention churchId={churchId} items={filteredAttention} />
    </div>
  );
}
```

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

Add `import { Input } from "@/components/ui/input";` and replace all `<input>` elements with `<Input>` — keep all existing props, add `className="bg-white rounded-none"` (the `rounded-none` overrides the `Input` component's default `rounded-md`, matching the project's zero-border-radius design system).

- [ ] **Step 2: Replace inline inputs on signup page**

Same pattern for all four input fields (name, email, password, confirm-password). Use `className="bg-white rounded-none"` on each.

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
4. Sidebar: Overview (active), Services, Rota | More: Repertoire, Service Sheets | Admin: Members, Settings
5. Click Services → completeness dots work, days without services show red "No services created"
6. Log in as member → overview shows availability (AvailabilityWidget), music list with resolved hymn/anthem names, "My availability"
7. The `/sundays` route still works if accessed directly (not broken) but is no longer in the nav

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
