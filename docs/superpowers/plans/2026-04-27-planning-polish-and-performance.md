# Planning polish + performance pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always show every Sunday + Principal Feast + Festival in the planning grid for every church (with a SUNG_EUCHARIST fallback when no pattern matches), polish the CSV import affordances, and apply targeted performance fixes (auth dedup via `React.cache`, server-rendered initial planning data, cell memoization, slimmer queries, bundle audit).

**Architecture:** All planning-grid changes stay client-side except where we move the initial data fetch to the page (Server Component). The "qualifying day" classification is a pure helper consumed by the existing `computeGhostRows`. Auth deduplication uses React's per-request `cache()`. No DB schema changes.

**Tech Stack:** Next.js 16, React 19, Drizzle, Supabase auth, Vitest, Playwright, Tailwind 4, lucide-react, date-fns.

---

## File Structure

**Created:**
- `src/app/(app)/churches/[churchId]/planning/principal-feasts.ts` — sundayKey list + `isQualifyingDay()` helper.
- `src/lib/planning/data.ts` — extracted shared planning-data fetcher used by both the API route and the server-rendered page.

**Modified:**
- `src/app/(app)/churches/[churchId]/planning/csv-import-modal.tsx` — close button.
- `src/app/(app)/churches/[churchId]/planning/date-range-controls.tsx` — drop `mb-4`.
- `src/app/(app)/churches/[churchId]/planning/planning-grid.tsx` — toolbar wrapper, accept `initialData`, memoized cell, callback stability.
- `src/app/(app)/churches/[churchId]/planning/planning-cell.tsx` — wrap default export in `React.memo`.
- `src/app/(app)/churches/[churchId]/planning/page.tsx` — server-side fetch, pass `initialData`.
- `src/app/(app)/churches/[churchId]/planning/ghost-rows.ts` — fallback row when no pattern covers a qualifying day.
- `src/app/(app)/churches/[churchId]/planning/__tests__/ghost-rows.test.ts` — extend.
- `src/app/api/churches/[churchId]/planning/route.ts` — switch to shared fetcher; add `sundayKey`/`section` to days projection.
- `src/lib/auth/permissions.ts` — wrap `getAuthUser` and a new `getChurchMembership` with `React.cache`.
- `src/app/(app)/layout.tsx` — call cached `getAuthUser`.
- `src/app/(app)/churches/[churchId]/layout.tsx` — call cached helpers, slim `select()` projection.

---

## Task 1: CSV modal close (×) button

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/planning/csv-import-modal.tsx:55-61`

- [ ] **Step 1: Replace the close-button markup**

In `csv-import-modal.tsx`, add the icon import at the top (next to existing imports):

```tsx
import { X } from "lucide-react";
```

Replace lines 58–61 (the entire `<div className="flex justify-between mb-4">…</div>` header block):

```tsx
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Import CSV</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
```

- [ ] **Step 2: Verify by hand**

Run `npm run dev`, open the planning page, click "Import CSV", confirm the close button is bordered, has an icon, and closes the modal.

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/csv-import-modal.tsx
git commit -m "fix(planning): make CSV import modal close button visible and accessible"
```

---

## Task 2: CSV toolbar alignment

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/planning/date-range-controls.tsx:24`
- Modify: `src/app/(app)/churches/[churchId]/planning/planning-grid.tsx:567-580`

- [ ] **Step 1: Drop `mb-4` from `DateRangeControls`**

In `date-range-controls.tsx`, change line 24 from:

```tsx
    <div className="flex items-center gap-2 mb-4">
```

to:

```tsx
    <div className="flex items-center gap-2">
```

- [ ] **Step 2: Wrap the toolbar in a single flex row**

In `planning-grid.tsx`, replace lines 569–579 (the existing `<div className="flex items-center gap-2 mb-1">…</div>` block plus the save-status `<div className="text-xs ... mb-2">` block) with:

```tsx
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DateRangeControls from={from} to={to} />
        <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
          Import CSV
        </Button>
      </div>

      <div className="text-xs text-muted-foreground h-5 mb-2">
        {state.saveStatus === "saving" && "Saving…"}
        {state.saveStatus === "saved" && "Saved ✓"}
        {state.saveStatus === "error" && <span className="text-destructive">Error saving</span>}
      </div>
```

- [ ] **Step 3: Verify by hand**

Run `npm run dev`, open the planning page. The date inputs, "→", "4 weeks", "Term", and "Import CSV" buttons all share the same vertical baseline. Resize the window narrow — toolbar wraps cleanly with `flex-wrap`.

- [ ] **Step 4: Confirm DateRangeControls isn't used elsewhere with the old margin assumption**

Run: `grep -rn "DateRangeControls" src --include="*.tsx" --include="*.ts"`
Expected: only `planning-grid.tsx` and `date-range-controls.tsx` itself. If anything else uses it, that caller now needs its own `mb-4`.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/date-range-controls.tsx \
        src/app/\(app\)/churches/\[churchId\]/planning/planning-grid.tsx
git commit -m "fix(planning): align Import CSV button with date range controls"
```

---

## Task 3: Principal-feasts module

**Files:**
- Create: `src/app/(app)/churches/[churchId]/planning/principal-feasts.ts`
- Test: `src/app/(app)/churches/[churchId]/planning/__tests__/principal-feasts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/(app)/churches/[churchId]/planning/__tests__/principal-feasts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isQualifyingDay, PRINCIPAL_FEAST_KEYS } from "../principal-feasts";

describe("isQualifyingDay", () => {
  it("returns true for any Sunday regardless of metadata", () => {
    // 2026-04-26 is a Sunday
    expect(isQualifyingDay("2026-04-26", null, null)).toBe(true);
  });

  it("returns false for a plain weekday with no metadata", () => {
    // 2026-04-28 is a Tuesday
    expect(isQualifyingDay("2026-04-28", null, null)).toBe(false);
  });

  it("returns true when the section is Festivals (weekday)", () => {
    // 2026-04-28 (Tue) classified as Festival
    expect(isQualifyingDay("2026-04-28", "some-festival", "Festivals")).toBe(true);
  });

  it("returns true when the sundayKey is a Principal Feast (weekday)", () => {
    // 2026-12-25 (Fri) Christmas Day
    expect(isQualifyingDay("2026-12-25", "christmas-day", "Christmas")).toBe(true);
  });

  it("PRINCIPAL_FEAST_KEYS includes the canonical CofE list", () => {
    expect(PRINCIPAL_FEAST_KEYS.has("christmas-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("easter-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("ascension-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("day-of-pentecost-whit-sunday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("trinity-sunday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("all-saints-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("the-epiphany")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("ash-wednesday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("maundy-thursday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("good-friday")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test (expect failure)**

Run: `npm test -- principal-feasts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/app/(app)/churches/[churchId]/planning/principal-feasts.ts`:

```ts
import { parseISO, getDay } from "date-fns";

/**
 * Sunday-key slugs for the CofE Principal Feasts and Principal Holy Days.
 * Slugs match the keys used in src/data/lectionary-coe.json.
 */
export const PRINCIPAL_FEAST_KEYS: ReadonlySet<string> = new Set([
  "christmas-day",
  "the-epiphany",
  "easter-day",
  "ascension-day",
  "day-of-pentecost-whit-sunday",
  "trinity-sunday",
  "all-saints-day",
  "ash-wednesday",
  "maundy-thursday",
  "good-friday",
]);

/**
 * A "qualifying day" is one that should always have at least one row in the
 * planning grid, even when the church has no pattern configured for that
 * weekday: every Sunday, every Principal Feast, every Festival.
 */
export function isQualifyingDay(
  date: string,
  sundayKey: string | null,
  section: string | null,
): boolean {
  // 0 = Sunday under date-fns (and JS Date)
  if (getDay(parseISO(date)) === 0) return true;
  if (section === "Festivals") return true;
  if (sundayKey && PRINCIPAL_FEAST_KEYS.has(sundayKey)) return true;
  return false;
}
```

- [ ] **Step 4: Run the test (expect pass)**

Run: `npm test -- principal-feasts`
Expected: PASS, all 5 cases.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/principal-feasts.ts \
        src/app/\(app\)/churches/\[churchId\]/planning/__tests__/principal-feasts.test.ts
git commit -m "feat(planning): add isQualifyingDay helper for Sundays/Feasts/Festivals"
```

---

## Task 4: Extend `computeGhostRows` with the fallback row

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/planning/ghost-rows.ts`
- Modify: `src/app/(app)/churches/[churchId]/planning/__tests__/ghost-rows.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `__tests__/ghost-rows.test.ts` at the bottom (inside the same `describe` block):

```ts
  it("emits a SUNG_EUCHARIST fallback for a Sunday with no patterns", () => {
    // 2026-04-26 is a Sunday
    const ghosts = computeGhostRows({
      from: "2026-04-26",
      to: "2026-04-26",
      patterns: [],
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toEqual({
      ghostId: "ghost:2026-04-26:SUNG_EUCHARIST",
      date: "2026-04-26",
      serviceType: "SUNG_EUCHARIST",
      time: null,
    });
  });

  it("does not emit a fallback when an enabled pattern already covers the day", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-26", // Sun
      to: "2026-04-26",
      patterns,
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    // The two Sunday patterns produce two ghosts; no fallback.
    expect(ghosts).toHaveLength(2);
    const types = ghosts.map((g) => g.serviceType).sort();
    expect(types).toEqual(["CHORAL_EVENSONG", "SUNG_EUCHARIST"]);
  });

  it("emits a fallback when only a non-matching pattern exists for the weekday", () => {
    const onlyWedPatterns = [
      { id: "p", dayOfWeek: 3, serviceType: "CHORAL_EVENSONG" as const, time: "17:30", enabled: true },
    ];
    const ghosts = computeGhostRows({
      from: "2026-04-26", // Sun
      to: "2026-04-26",
      patterns: onlyWedPatterns,
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].serviceType).toBe("SUNG_EUCHARIST");
  });

  it("emits a fallback for a weekday Principal Feast with no matching pattern", () => {
    const ghosts = computeGhostRows({
      from: "2026-12-25", // Fri Christmas Day
      to: "2026-12-25",
      patterns: [], // no Friday patterns
      existingServices: [],
      qualifyingDays: [{ date: "2026-12-25", sundayKey: "christmas-day", section: "Christmas" }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].serviceType).toBe("SUNG_EUCHARIST");
  });

  it("does not emit a fallback when an existing service already covers the qualifying day with SUNG_EUCHARIST", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-26",
      to: "2026-04-26",
      patterns: [],
      existingServices: [{ date: "2026-04-26", serviceType: "SUNG_EUCHARIST" }],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(0);
  });

  it("does not emit a fallback for a non-qualifying weekday", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-28", // Tue, not Festival, not Principal Feast
      to: "2026-04-28",
      patterns: [],
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-28", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(0);
  });
```

- [ ] **Step 2: Run the tests (expect failure)**

Run: `npm test -- ghost-rows`
Expected: FAIL — `qualifyingDays` is not a recognised arg / no fallback rows emitted.

- [ ] **Step 3: Implement the fallback**

Replace the entire contents of `src/app/(app)/churches/[churchId]/planning/ghost-rows.ts` with:

```ts
import { addDays, format, parseISO } from "date-fns";
import { isQualifyingDay } from "./principal-feasts";

// Values mirror serviceTypeEnum in schema-base.ts exactly.
type ServiceType =
  | "SUNG_EUCHARIST"
  | "CHORAL_EVENSONG"
  | "SAID_EUCHARIST"
  | "CHORAL_MATINS"
  | "FAMILY_SERVICE"
  | "COMPLINE"
  | "CUSTOM";

export interface PatternInput {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  serviceType: ServiceType;
  time: string | null;
  enabled: boolean;
}

export interface ExistingServiceRef {
  date: string;
  serviceType: ServiceType;
}

export interface QualifyingDayInput {
  date: string;
  sundayKey: string | null;
  section: string | null;
}

export interface GhostRow {
  ghostId: string;
  date: string;
  serviceType: ServiceType;
  time: string | null;
}

const FALLBACK_TYPE: ServiceType = "SUNG_EUCHARIST";

export function computeGhostRows(args: {
  from: string;
  to: string;
  patterns: PatternInput[];
  existingServices: ExistingServiceRef[];
  qualifyingDays?: QualifyingDayInput[];
}): GhostRow[] {
  const existingKey = new Set(
    args.existingServices.map((s) => `${s.date}:${s.serviceType}`),
  );

  const start = parseISO(args.from);
  const end = parseISO(args.to);
  const ghosts: GhostRow[] = [];

  // Pattern-driven ghosts (existing behaviour).
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const date = format(d, "yyyy-MM-dd");
    const dow = d.getDay();

    for (const p of args.patterns) {
      if (!p.enabled) continue;
      if (p.dayOfWeek !== dow) continue;
      const key = `${date}:${p.serviceType}`;
      if (existingKey.has(key)) continue;
      ghosts.push({
        ghostId: `ghost:${date}:${p.serviceType}`,
        date,
        serviceType: p.serviceType,
        time: p.time,
      });
    }
  }

  // Fallback ghosts: every qualifying day that ended up with zero rows
  // (no existing service, no pattern-driven ghost) gets a SUNG_EUCHARIST row.
  if (args.qualifyingDays && args.qualifyingDays.length > 0) {
    const datesWithRow = new Set<string>();
    for (const r of args.existingServices) datesWithRow.add(r.date);
    for (const g of ghosts) datesWithRow.add(g.date);

    for (const q of args.qualifyingDays) {
      if (datesWithRow.has(q.date)) continue;
      if (!isQualifyingDay(q.date, q.sundayKey, q.section)) continue;
      ghosts.push({
        ghostId: `ghost:${q.date}:${FALLBACK_TYPE}`,
        date: q.date,
        serviceType: FALLBACK_TYPE,
        time: null,
      });
    }
  }

  return ghosts;
}
```

- [ ] **Step 4: Run the tests (expect pass)**

Run: `npm test -- ghost-rows`
Expected: PASS — original 3 tests + 6 new tests = 9 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/ghost-rows.ts \
        src/app/\(app\)/churches/\[churchId\]/planning/__tests__/ghost-rows.test.ts
git commit -m "feat(planning): emit SUNG_EUCHARIST fallback for qualifying days with no pattern"
```

---

## Task 5: API route — add `sundayKey` and `section` to days projection

**Files:**
- Modify: `src/app/api/churches/[churchId]/planning/route.ts`

- [ ] **Step 1: Verify the lectionary section lookup**

Run: `grep -n "section" src/lib/lectionary/types.ts`
Expected: `section: string;` on `LectionarySunday`.

- [ ] **Step 2: Update the API route**

In `src/app/api/churches/[churchId]/planning/route.ts`, replace the body of the function with the version below. The change: the days projection includes `sundayKey` (= `icalUid`) and `section` (looked up from the lectionary JSON by sundayKey).

Replace lines 26–32 (the `days` query) with:

```ts
  // 1. Liturgical days in range — select only the columns the client needs.
  const dayRows = await db
    .select({
      id: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      season: liturgicalDays.season,
      colour: liturgicalDays.colour,
      icalUid: liturgicalDays.icalUid,
    })
    .from(liturgicalDays)
    .where(and(gte(liturgicalDays.date, from), lte(liturgicalDays.date, to)))
    .orderBy(asc(liturgicalDays.date));
```

Add a new import at the top of the file (after the existing imports):

```ts
import lectionaryData from "@/data/lectionary-coe.json";
```

Right after the `dayRows` query, build the projected days:

```ts
  const sundays = (lectionaryData as { sundays: Record<string, { section: string }> }).sundays;
  const days = dayRows.map((d) => {
    const sundayKey = d.icalUid ?? null;
    const section = sundayKey && sundays[sundayKey] ? sundays[sundayKey].section : null;
    return {
      id: d.id,
      date: d.date,
      cwName: d.cwName,
      season: d.season,
      colour: d.colour,
      sundayKey,
      section,
    };
  });
  const dayIds = days.map((d) => d.id);
```

Delete the existing `const dayIds = days.map(...)` line that follows (now superseded).

The final `return NextResponse.json({ days, services: serviceRows, slots: slotRows, readings: readingRows, patterns })` is unchanged — `days` now includes the new fields automatically.

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Sanity-check at runtime**

Run `npm run dev`, open the planning page in a browser. Open DevTools → Network → click on the `planning?from=…` response. Confirm each `days[*]` item has `sundayKey` and `section` fields (most weekdays will have both null; Sundays should have a populated `sundayKey` and a non-Festival section like `"Easter"`).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/churches/\[churchId\]/planning/route.ts
git commit -m "feat(planning-api): include sundayKey and section in days projection"
```

---

## Task 6: Wire the fallback rows into the client grid

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/planning/planning-grid.tsx`

- [ ] **Step 1: Update `ApiDay` and `buildRowsFromApi`**

In `planning-grid.tsx`, change the `ApiDay` interface (lines 23–29) to:

```tsx
interface ApiDay {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;
  section: string | null;
}
```

In `buildRowsFromApi` (around line 291), change the call to `computeGhostRows` to also pass `qualifyingDays`. Replace the existing line:

```tsx
  const ghosts = computeGhostRows({ from, to, patterns: data.patterns, existingServices: existingRefs });
```

with:

```tsx
  const qualifyingDays = data.days.map((d) => ({
    date: d.date,
    sundayKey: d.sundayKey,
    section: d.section,
  }));

  const ghosts = computeGhostRows({
    from,
    to,
    patterns: data.patterns,
    existingServices: existingRefs,
    qualifyingDays,
  });
```

- [ ] **Step 2: Remove the `noPatterns` empty-state guard, replace with inline hint**

In `planning-grid.tsx`, delete lines 542–554 (the `if (noPatterns) { return … }` block) entirely.

Change line 344 from:

```tsx
  const [noPatterns, setNoPatterns] = useState(false);
```

to:

```tsx
  const [hasNoPatterns, setHasNoPatterns] = useState(false);
```

Change line 360 from:

```tsx
        setNoPatterns(data.patterns.length === 0 && data.services.length === 0);
```

to:

```tsx
        setHasNoPatterns(data.patterns.length === 0);
```

In the render block, immediately after the toolbar (after the `<div className="flex flex-wrap …">…</div>` closing tag added in Task 2, and before the save-status indicator), insert:

```tsx
      {hasNoPatterns && (
        <div className="mb-3 p-2 text-xs border rounded bg-muted/40 text-muted-foreground">
          Showing default Sunday and Festival rows.{" "}
          <a className="underline" href={`/churches/${churchId}/settings/service-patterns`}>
            Configure service patterns
          </a>{" "}
          to add weekday and additional services.
        </div>
      )}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Two scenarios:

1. **Church with patterns:** Open planning. Behaviour identical to today plus, for any Sunday/Festival not covered by a pattern, you see one extra `Sung Eucharist` row.
2. **Church with zero patterns:** Open planning. The "Configure service patterns" empty state is gone. The grid shows one `Sung Eucharist` row per Sunday (and per Festival/Principal Feast in range). The inline hint banner appears at the top of the grid linking to settings.

- [ ] **Step 4: Type-check + tests**

Run: `npm run typecheck && npm test`
Expected: typecheck passes; no test regressions.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/planning-grid.tsx
git commit -m "feat(planning): always show Sundays/Feasts/Festivals; replace empty state with hint"
```

---

## Task 7: Auth dedup with `React.cache`

**Files:**
- Modify: `src/lib/auth/permissions.ts`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/churches/[churchId]/layout.tsx`
- Test: `src/lib/auth/__tests__/permissions-cache.test.ts` (create if absent)

- [ ] **Step 1: Add cached helpers to `permissions.ts`**

In `src/lib/auth/permissions.ts`, add `cache` to the React import block and a new export `getChurchMembership`. Replace the file with:

```ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { MemberRole } from "@/types";

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  MEMBER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

export const VALID_MEMBER_ROLES = Object.keys(ROLE_HIERARCHY) as MemberRole[];

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && value in ROLE_HIERARCHY;
}

export function coerceMemberRole(value: unknown): MemberRole {
  if (isMemberRole(value)) return value;
  console.warn("[permissions] Unexpected role value — defaulting to MEMBER", { value });
  return "MEMBER";
}

export function hasMinRole(userRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Wrapped in React.cache so multiple callers within a single server-render
 * request share a single Supabase getUser() round-trip and a single users
 * lookup. Across different requests no caching occurs.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, user.id))
    .limit(1);

  if (dbUser.length === 0) return null;
  return dbUser[0];
});

/**
 * Wrapped in React.cache for the same reason. Keyed on (userId, churchId).
 */
export const getChurchMembership = cache(
  async (userId: string, churchId: string) => {
    const rows = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, userId),
          eq(churchMemberships.churchId, churchId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },
);

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireChurchRole(churchId: string, minRole: MemberRole) {
  const { user, error } = await requireAuth();
  if (error) return { user: null, membership: null, error };

  const membership = await getChurchMembership(user!.id, churchId);

  if (!membership) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Not a member of this church" }, { status: 403 }),
    };
  }

  if (!hasMinRole(coerceMemberRole(membership.role), minRole)) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  return { user: user!, membership, error: null };
}
```

- [ ] **Step 2: Update `(app)/layout.tsx` to use the cached helper**

In `src/app/(app)/layout.tsx`, replace the entire file with:

```tsx
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/permissions";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
```

Note: the previous code redirected when there was no Supabase user; the new code redirects when there's no DB user (which implies no Supabase user, since `getAuthUser` returns null in that case). Behaviour is equivalent for any user that has gone through the normal signup flow.

- [ ] **Step 3: Update `(app)/churches/[churchId]/layout.tsx` to use the cached helpers and a slimmer projection**

In `src/app/(app)/churches/[churchId]/layout.tsx`, replace the entire file with:

```tsx
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, getChurchMembership, hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { ChurchSidebar } from "@/components/church-sidebar";
import { MigrationBanner } from "@/components/migration-banner";

interface Props {
  children: React.ReactNode;
  params: Promise<{ churchId: string }>;
}

export default async function ChurchLayout({ children, params }: Props) {
  const { churchId } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const membership = await getChurchMembership(user.id, churchId);
  if (!membership) redirect("/churches");

  const churchRow = await db
    .select({ name: churches.name })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);

  if (churchRow.length === 0) redirect("/churches");

  const userRole = coerceMemberRole(membership.role);
  const isAdmin = hasMinRole(userRole, "ADMIN");
  const canEdit = hasMinRole(userRole, "EDITOR");

  interface NavGroup {
    label?: string;
    items: { href: string; label: string; iconName: string; exactMatch?: boolean }[];
  }

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: `/churches/${churchId}`, label: "Overview", iconName: "Home", exactMatch: true },
        { href: `/churches/${churchId}/services`, label: "Services", iconName: "Calendar" },
        ...(canEdit ? [{ href: `/churches/${churchId}/planning`, label: "Planning", iconName: "LayoutGrid" }] : []),
        { href: `/churches/${churchId}/rota`, label: "Rota", iconName: "Users" },
      ],
    },
    {
      label: "More",
      items: [
        { href: `/churches/${churchId}/repertoire`, label: "Repertoire", iconName: "Music" },
      ],
    },
    ...(isAdmin ? [{
      label: "Admin",
      items: [
        { href: `/churches/${churchId}/members`, label: "Members", iconName: "Users" },
        { href: `/churches/${churchId}/service-sheets`, label: "Service Sheets", iconName: "FileText" },
        { href: `/churches/${churchId}/music-list`, label: "Music List", iconName: "ScrollText" },
        { href: `/churches/${churchId}/settings`, label: "Settings", iconName: "Settings" },
      ],
    }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ChurchSidebar
        churchId={churchId}
        churchName={churchRow[0].name}
        userRole={membership.role}
        userEmail={user.email}
        navGroups={navGroups}
      />
      <main id="main-content" className="flex-1">
        {isAdmin && <MigrationBanner churchId={churchId} />}
        {children}
      </main>
    </div>
  );
}
```

Note: the slimmer projection picks only `churches.name`. Whether `users.email` is non-null depends on the schema — verify in step 4.

- [ ] **Step 4: Verify `users.email` exists and is non-nullable**

Run: `grep -n "email" src/lib/db/schema-base.ts | head`
If `email` is nullable, change `userEmail={user.email}` to `userEmail={user.email ?? ""}` to match the prior `user.email || ""`.

- [ ] **Step 5: Type-check**

Run: `npm run typecheck`
Expected: no errors. If `db.execute` typings or the `users` row shape have changed in the meantime, fix them now.

- [ ] **Step 6: Manual smoke test**

Run `npm run dev`. Log in. Navigate to `/churches/{your-church}/planning`. Confirm the page renders, the sidebar shows the correct church name and your role, and there are no auth errors. Sign out and confirm you're redirected to `/login`.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS. Any test that mocked `requireChurchRole` or its DB calls should still pass — the public surface is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/permissions.ts \
        src/app/\(app\)/layout.tsx \
        src/app/\(app\)/churches/\[churchId\]/layout.tsx
git commit -m "perf(auth): dedup auth + membership lookups with React.cache; slim sidebar query"
```

---

## Task 8: Server-render initial planning data

**Files:**
- Create: `src/lib/planning/data.ts`
- Modify: `src/app/api/churches/[churchId]/planning/route.ts`
- Modify: `src/app/(app)/churches/[churchId]/planning/page.tsx`
- Modify: `src/app/(app)/churches/[churchId]/planning/planning-grid.tsx`

- [ ] **Step 1: Extract the fetch into `src/lib/planning/data.ts`**

Create `src/lib/planning/data.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";
import {
  services, musicSlots, hymns, anthems, massSettings, canticleSettings,
  responsesSettings, liturgicalDays, readings,
} from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, asc, sql } from "drizzle-orm";
import lectionaryData from "@/data/lectionary-coe.json";

export interface PlanningDayProjection {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;
  section: string | null;
}

export interface PlanningDataResponse {
  days: PlanningDayProjection[];
  services: Awaited<ReturnType<typeof loadServices>>;
  slots: Awaited<ReturnType<typeof loadSlots>>;
  readings: Awaited<ReturnType<typeof loadReadings>>;
  patterns: Array<{
    id: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
    enabled: boolean;
  }>;
}

async function loadDays(from: string, to: string): Promise<PlanningDayProjection[]> {
  const dayRows = await db
    .select({
      id: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      season: liturgicalDays.season,
      colour: liturgicalDays.colour,
      icalUid: liturgicalDays.icalUid,
    })
    .from(liturgicalDays)
    .where(and(gte(liturgicalDays.date, from), lte(liturgicalDays.date, to)))
    .orderBy(asc(liturgicalDays.date));

  const sundays = (lectionaryData as { sundays: Record<string, { section: string }> }).sundays;
  return dayRows.map((d) => {
    const sundayKey = d.icalUid ?? null;
    const section = sundayKey && sundays[sundayKey] ? sundays[sundayKey].section : null;
    return {
      id: d.id,
      date: d.date,
      cwName: d.cwName,
      season: d.season,
      colour: d.colour,
      sundayKey,
      section,
    };
  });
}

async function loadServices(churchId: string, dayIds: string[]) {
  if (dayIds.length === 0) return [];
  return db
    .select({
      id: services.id,
      churchId: services.churchId,
      liturgicalDayId: services.liturgicalDayId,
      serviceType: services.serviceType,
      time: services.time,
      status: services.status,
      notes: services.notes,
    })
    .from(services)
    .where(and(eq(services.churchId, churchId), inArray(services.liturgicalDayId, dayIds)));
}

async function loadSlots(serviceIds: string[]) {
  if (serviceIds.length === 0) return [];
  return db
    .select({
      id: musicSlots.id,
      serviceId: musicSlots.serviceId,
      slotType: musicSlots.slotType,
      positionOrder: musicSlots.positionOrder,
      hymnId: musicSlots.hymnId,
      anthemId: musicSlots.anthemId,
      massSettingId: musicSlots.massSettingId,
      canticleSettingId: musicSlots.canticleSettingId,
      responsesSettingId: musicSlots.responsesSettingId,
      freeText: musicSlots.freeText,
      psalmChant: musicSlots.psalmChant,
      hymnBook: hymns.book,
      hymnNumber: hymns.number,
      hymnFirstLine: hymns.firstLine,
      anthemTitle: anthems.title,
      anthemComposer: anthems.composer,
      massSettingName: massSettings.name,
      massSettingComposer: massSettings.composer,
      canticleSettingName: canticleSettings.name,
      canticleSettingComposer: canticleSettings.composer,
      responsesSettingName: responsesSettings.name,
      responsesSettingComposer: responsesSettings.composer,
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .leftJoin(massSettings, eq(musicSlots.massSettingId, massSettings.id))
    .leftJoin(canticleSettings, eq(musicSlots.canticleSettingId, canticleSettings.id))
    .leftJoin(responsesSettings, eq(musicSlots.responsesSettingId, responsesSettings.id))
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));
}

async function loadReadings(dayIds: string[]) {
  if (dayIds.length === 0) return [];
  return db
    .select()
    .from(readings)
    .where(inArray(readings.liturgicalDayId, dayIds));
}

async function loadPatterns(churchId: string) {
  return db.execute<{
    id: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
    enabled: boolean;
  }>(sql`
    SELECT id, day_of_week AS "dayOfWeek", service_type AS "serviceType", time, enabled
    FROM church_service_patterns
    WHERE church_id = ${churchId}
  `);
}

export async function getPlanningData(
  churchId: string,
  from: string,
  to: string,
): Promise<PlanningDataResponse> {
  const days = await loadDays(from, to);
  const dayIds = days.map((d) => d.id);
  const serviceRows = await loadServices(churchId, dayIds);
  const serviceIds = serviceRows.map((s) => s.id);
  const slotRows = await loadSlots(serviceIds);
  const readingRows = await loadReadings(dayIds);
  const patterns = await loadPatterns(churchId);
  return { days, services: serviceRows, slots: slotRows, readings: readingRows, patterns };
}
```

- [ ] **Step 2: Slim the API route to call the shared fetcher**

Replace `src/app/api/churches/[churchId]/planning/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { getPlanningData } from "@/lib/planning/data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const data = await getPlanningData(churchId, from, to);
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Server-render the initial data in `page.tsx`**

Replace `src/app/(app)/churches/[churchId]/planning/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { format, addWeeks } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import { getPlanningData } from "@/lib/planning/data";
import { PlanningGrid } from "./planning-grid";

interface Props {
  params: Promise<{ churchId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function PlanningPage({ params, searchParams }: Props) {
  const { churchId } = await params;
  const sp = await searchParams;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) redirect(`/churches/${churchId}`);

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultTo = format(addWeeks(new Date(), 6), "yyyy-MM-dd");
  const from = sp.from ?? today;
  const to = sp.to ?? defaultTo;

  const initialData = await getPlanningData(churchId, from, to);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Planning</h1>
      <PlanningGrid churchId={churchId} from={from} to={to} initialData={initialData} />
    </div>
  );
}
```

- [ ] **Step 4: Accept `initialData` in `PlanningGrid` and skip the cold fetch**

In `planning-grid.tsx`:

a. Add an import at the top, near the existing type imports:

```tsx
import type { PlanningDataResponse } from "@/lib/planning/data";
```

b. Change the `Props` interface (around line 333) to:

```tsx
interface Props {
  churchId: string;
  from: string;
  to: string;
  initialData: PlanningDataResponse;
}
```

c. Change the function signature and the loading state (around line 340–346):

```tsx
export function PlanningGrid({ churchId, from, to, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [hasNoPatterns, setHasNoPatterns] = useState(
    initialData.patterns.length === 0,
  );

  const { state, dispatch, getCell } = usePlanningGrid(
    buildRowsFromApi(initialData as ApiResponse, from, to),
  );
```

The `usePlanningGrid` hook currently takes `[]` and is updated by `dispatch({ type: "SET_ROWS", … })`. Pre-seeding via the constructor avoids the initial empty render. If `usePlanningGrid` does not accept an initial-rows arg, see step 4d.

d. **Verify `usePlanningGrid` accepts initial rows.** If `usePlanningGrid([])` is the only signature, leave the hook call as `usePlanningGrid([])` and instead seed via a synchronous `useState`-style effect:

```tsx
  // Initial seed: hydrate rows from server-rendered data on first render.
  useEffect(() => {
    dispatch({ type: "SET_ROWS", rows: buildRowsFromApi(initialData as ApiResponse, from, to) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Run: `grep -n "export function usePlanningGrid" src/app/\(app\)/churches/\[churchId\]/planning/use-planning-grid.ts`

If the hook signature shows it accepts `(initialRows: PlanningRow[])`, use option (c). Otherwise use option (d).

e. Replace the existing fetch effect (lines 350–368) so it only runs when `from`/`to` change *after* mount. Track the first mount:

```tsx
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    setLoading(true);
    setFetchError(null);

    fetch(`/api/churches/${churchId}/planning?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        setHasNoPatterns(data.patterns.length === 0);
        dispatch({ type: "SET_ROWS", rows: buildRowsFromApi(data, from, to) });
        setLoading(false);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [churchId, from, to, dispatch]);
```

Add `useRef` to the React imports if it's not already imported.

f. The `if (loading) { return … }` block (lines 524–531) now only fires on date-range changes. Leave it in place — it's still a valid loading state for refetches.

- [ ] **Step 5: Type-check + tests**

Run: `npm run typecheck && npm test`
Expected: typecheck passes, tests pass.

- [ ] **Step 6: Manual verification**

Run `npm run dev`. Open `/churches/{id}/planning`. The grid renders **without** a "Loading grid…" flash. Change the date range (click "12 weeks") — that path still does a client fetch and shows "Loading grid…" briefly. Edit a cell — save still works (calls the unchanged `/cell` endpoint). Paste a 3×2 block from a spreadsheet — paste still works.

- [ ] **Step 7: Commit**

```bash
git add src/lib/planning/data.ts \
        src/app/api/churches/\[churchId\]/planning/route.ts \
        src/app/\(app\)/churches/\[churchId\]/planning/page.tsx \
        src/app/\(app\)/churches/\[churchId\]/planning/planning-grid.tsx
git commit -m "perf(planning): server-render initial grid data; eliminate cold-load fetch"
```

---

## Task 9: Memoize `PlanningCell` and stabilize callbacks

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/planning/planning-cell.tsx`
- Modify: `src/app/(app)/churches/[churchId]/planning/planning-grid.tsx`

- [ ] **Step 1: Wrap `PlanningCell` in `React.memo`**

In `planning-cell.tsx`, change the imports (line 3) to:

```tsx
import { useState, useEffect, useRef, memo } from "react";
```

At the bottom of the file, replace the existing `export function PlanningCell(...)` with a default unmemoized impl renamed to `PlanningCellInner`, then export a memoized `PlanningCell`:

a. Rename the existing `export function PlanningCell` to `function PlanningCellInner` (drop the `export` keyword).

b. Append the following at the bottom of the file:

```tsx
function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.column === next.column &&
    prev.focused === next.focused &&
    prev.editing === next.editing &&
    prev.serviceType === next.serviceType &&
    prev.churchId === next.churchId &&
    prev.search === next.search &&
    prev.value.displayText === next.value.displayText &&
    prev.value.refId === next.value.refId &&
    prev.value.isUnmatched === next.value.isUnmatched &&
    prev.onFocus === next.onFocus &&
    prev.onEnterEdit === next.onEnterEdit &&
    prev.onCancelEdit === next.onCancelEdit &&
    prev.onCommit === next.onCommit
  );
}

export const PlanningCell = memo(PlanningCellInner, arePropsEqual);
```

The custom equality is necessary because `value` is an object reference: a shallow `===` would say two cells with the same `displayText` are different.

- [ ] **Step 2: Stabilize the inline callbacks in `planning-grid.tsx`**

The four `onFocus` / `onEnterEdit` / `onCancelEdit` / `onCommit` callbacks in the current `<PlanningCell …>` JSX (around lines 643–653) are recreated on every render. Replace them with stable handlers that close over `(rk, col.key)` via a single shared dispatcher.

Above the `return (` of `PlanningGrid`, add:

```tsx
  const handleFocus = useCallback((rk: string, column: GridColumn) => {
    dispatch({ type: "FOCUS", rowKey: rk, column });
  }, [dispatch]);

  const handleEnterEdit = useCallback((rk: string, column: GridColumn) => {
    dispatch({ type: "FOCUS", rowKey: rk, column });
    dispatch({ type: "ENTER_EDIT" });
  }, [dispatch]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: "CANCEL_EDIT" });
  }, [dispatch]);

  const handleCommit = useCallback(
    (row: PlanningRow, column: GridColumn, previous: CellDisplay, next: CellDisplay) => {
      const rk = rowKey(row);
      dispatch({ type: "COMMIT_CELL", rowKey: rk, column, value: next, previous });
      void persistCell(row, column, next);
    },
    // persistCell is defined inside the component but isn't a hook-stable
    // reference; passing dispatch is enough — persistCell is closed over.
    [dispatch],
  );
```

Add `useCallback` to the React import block at the top of the file if not present.

In the JSX where `<PlanningCell …>` is rendered (lines 633–654), replace the four handler props with:

```tsx
                      onFocus={() => handleFocus(rk, col.key)}
                      onEnterEdit={() => handleEnterEdit(rk, col.key)}
                      onCancelEdit={handleCancelEdit}
                      onCommit={(next) => handleCommit(row, col.key, cellValue, next)}
```

The first two are still per-render arrow functions, but they're tiny and the equality function compares the cell's own props for memoization fairness. To make memoization fully effective, we'd need to refactor `PlanningCell` to accept `rowKey` + `column` and call back via a single shared handler. That refactor is out of scope here. Step 1 alone gives most of the win for cells whose `value` doesn't change: they bail out early on the `value`/`focused`/`editing` checks.

- [ ] **Step 3: Type-check + tests**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Sanity-check at runtime**

Run `npm run dev`. Edit a cell — confirm the save-status indicator goes "Saving… → Saved ✓" and the cell shows the new value. Use arrow keys to move focus across cells — the grid stays responsive. Cmd-Z to undo — works as before.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/planning/planning-cell.tsx \
        src/app/\(app\)/churches/\[churchId\]/planning/planning-grid.tsx
git commit -m "perf(planning): memoize PlanningCell; stabilize grid callbacks"
```

---

## Task 10: Bundle audit

**Files:**
- Modify: `next.config.ts` (if `@next/bundle-analyzer` not yet wired)
- Modify: `package.json` (devDependency, optional)

- [ ] **Step 1: Check whether `@next/bundle-analyzer` is already installed**

Run: `grep -n "bundle-analyzer" package.json`
If missing, install it as a dev dep: `npm install --save-dev @next/bundle-analyzer`.

- [ ] **Step 2: Wire the analyzer**

Replace `next.config.ts` top section to wrap the export with the analyzer (preserve the existing `headers()` and other config — only the wrapping changes):

```ts
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV === "development";

// … existing csp, scriptSrc constants stay unchanged …

const nextConfig: NextConfig = {
  // … existing async headers() body unchanged …
};

export default withBundleAnalyzer(nextConfig);
```

(Keep the `csp` / `scriptSrc` constants and the `headers()` body exactly as they are today.)

- [ ] **Step 3: Build with the analyzer enabled**

Run: `ANALYZE=true npm run build`
Expected: build completes; HTML reports open in browser tabs (or are written to `.next/analyze/`).

- [ ] **Step 4: Inspect the reports**

Open the **client** report. Search for `lectionary-coe.json` and `lectionary-readings-text.json`:

- **Pass:** they appear only in **server** chunks. Move on.
- **Fail:** they appear in a client chunk. Find which module imports them transitively. The likely culprit is a Server Component re-exporting from `lib/lectionary/*` and being marked `"use client"` somewhere in its tree, or a shared module being imported from a Client Component. Trace via `grep -rn "from \"@/lib/lectionary" src` and verify each consumer.

In the client report, also confirm:
- `lucide-react` is tree-shaken (only specific icons appear, not the whole pack).
- `date-fns` modules are imported by name (no monolithic `date-fns/index` chunk).
- The largest client chunks are the route bundles, not a third-party dep.

- [ ] **Step 5: Record the findings**

Append a short "Audit findings" section at the bottom of `docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md`. Format:

```md
## Bundle audit findings (run on YYYY-MM-DD)

- Largest client chunks: <route> (<size>), <route> (<size>)
- lectionary JSON in client bundles: yes/no — <details>
- lucide-react tree-shaking: ok / problem — <details>
- date-fns: ok / problem — <details>
- Action items filed:
  - [ ] (small fix to do here, if any)
  - [ ] (follow-up issue title and link, if any)
```

- [ ] **Step 6: Apply any small fixes inline**

If the audit surfaces a narrow, low-risk fix (e.g., a single accidental client import of a server-only module), fix it in this task. Anything bigger gets a follow-up issue, not a same-PR fix.

- [ ] **Step 7: Verify the production build still succeeds**

Run: `npm run build`
Expected: build passes with no warnings about server-only modules in client chunks.

- [ ] **Step 8: Commit**

```bash
git add next.config.ts package.json package-lock.json docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md
git commit -m "perf: wire bundle analyzer; record audit findings"
```

If step 6 made code changes, include them in this commit.

---

## Task 11: Link prefetching sanity check

**Files:**
- (Audit only; modifications only if `<a>` tags are found where `<Link>` should be.)

- [ ] **Step 1: Sweep for raw `<a href>` in client components**

Run:

```bash
grep -rn '<a href="/' src/components src/app --include="*.tsx" | grep -v '\.md:' | head -40
```

Expected: links to internal routes use `<Link href="...">`, not `<a href="...">`. External links (e.g., `https://...`) and skip-to-content `<a href="#main-content">` are fine as plain anchors.

- [ ] **Step 2: Replace any internal `<a>` with `<Link>`**

For each finding, swap:

```tsx
<a href="/some/internal/path">…</a>
```

with:

```tsx
import Link from "next/link";
…
<Link href="/some/internal/path">…</Link>
```

The known callsite worth checking is the inline hint banner introduced in Task 6 (`<a className="underline" href={...service-patterns}>Configure service patterns</a>`). If keeping it as `<a>`, the sweep will flag it — promote to `<Link>`:

```tsx
<Link className="underline" href={`/churches/${churchId}/settings/service-patterns`}>
  Configure service patterns
</Link>
```

- [ ] **Step 3: Type-check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -u src
git commit -m "perf: prefer next/link for internal navigation to enable prefetching"
```

If no fixes were needed, skip the commit and note it in the doc.

---

## Task 12: Re-measure baseline and record results

**Files:**
- Modify: `docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md`

- [ ] **Step 1: Build and start the production server**

Run:

```bash
npm run build
npm start
```

In a separate terminal, run any DB seeding required to have realistic test data (a test church with patterns, a test church without, a few hundred services).

- [ ] **Step 2: Capture Lighthouse runs**

For each of `/churches`, `/churches/{id}`, `/churches/{id}/planning` (with patterns and without), `/churches/{id}/services`:

- Open Chrome DevTools → Lighthouse → **Performance** category, **Mobile** + **Desktop** runs separately.
- Record the Performance score, LCP, TBT, CLS, TTFB for each.

- [ ] **Step 3: Capture in-app navigation timings**

Manually time these transitions on a warm session (use `performance.now()` in DevTools console between clicks if a stopwatch is too noisy):

- Overview → Planning
- Planning → Services
- Services → Repertoire
- Switching churches via the sidebar/footer

- [ ] **Step 4: Capture Planning grid micro-benchmarks**

- Cold render of the planning grid for the default 6-week range (first paint after navigation).
- Cell focus → typed character → Saved ✓ indicator: end-to-end latency.
- Paste a 10-row × 9-column block from a spreadsheet: time to "Saved ✓".

- [ ] **Step 5: Append a "Baseline" appendix to the spec**

Add to the bottom of `docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md`:

```md
## Performance results (post-fix, YYYY-MM-DD)

### Lighthouse (production build)

| Page | Mobile Perf | LCP | TBT | TTFB |
|------|-------------|-----|-----|------|
| /churches | … | … | … | … |
| /churches/{id} | … | … | … | … |
| /churches/{id}/planning (with patterns) | … | … | … | … |
| /churches/{id}/planning (no patterns) | … | … | … | … |
| /churches/{id}/services | … | … | … | … |

### In-app navigation (warm)

| From → To | Wall-clock (ms) |
|-----------|-----------------|
| Overview → Planning | … |
| Planning → Services | … |
| Services → Repertoire | … |
| Switch church | … |

### Planning grid

| Action | Latency |
|--------|---------|
| Cold render (6 weeks) | … |
| Cell edit → Saved ✓ | … |
| Paste 10×9 block | … |

### Notes

- Anything that did *not* improve as expected; theories.
- Follow-up issues filed: <links/titles>.
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md
git commit -m "docs: record post-fix performance baseline"
```

---

## Self-review checklist

Run before declaring the plan complete:

- All 12 tasks have explicit code (no placeholder text where code is needed).
- Each task ends with a commit step.
- Type names referenced across tasks match: `PlanningDataResponse`, `PlanningRow`, `PlanningDayProjection`, `QualifyingDayInput`, `GhostRow`, `PatternInput`, `ExistingServiceRef`.
- The hook-name check in Task 8 step 4d covers the case where `usePlanningGrid` doesn't accept initial rows.
- Tests are added for new pure logic (`isQualifyingDay`, `computeGhostRows` fallback). UI changes are verified manually + via existing tests.
- The fallback row's `serviceType` (`SUNG_EUCHARIST`) is consistent everywhere it's referenced.
- No task introduces a feature flag, backwards-compat shim, or comments narrating intent that the code already shows.
