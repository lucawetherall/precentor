# Planning polish + performance pass — design

Date: 2026-04-27
Status: Draft for implementation

## Summary

Four related fixes to the planning experience and overall site responsiveness:

1. Always show every Sunday + Principal Feast + Festival as a row in the planning grid, even when the church has no `church_service_patterns` configured for that day.
2. Align the "Import CSV" trigger with the date-range controls.
3. Make the CSV-import modal close (×) button visible and accessible.
4. Run a focused performance pass — initial page load, in-app navigation, and the planning grid specifically — and apply targeted fixes.

## Goals

- For any user opening `/churches/{id}/planning`: every Sunday + Principal Feast + Festival within the date range produces at least one ghost row, regardless of pattern configuration.
- The planning toolbar (date range, "Import CSV") reads as a single coherent control row, with all controls vertically aligned.
- The CSV modal close affordance is immediately visible to a user glancing at the dialog.
- A user navigating between churches/pages and editing the planning grid feels meaningfully faster after this work — measured against a Lighthouse + manual baseline captured before and after.

## Non-goals

- No DB schema changes. The "Sunday/Feast/Festival" classification is derived from existing `liturgical_days` rows + the lectionary JSON.
- No changes to how `church_service_patterns` work or to the patterns settings page.
- No changes to the patterns-empty-state copy on other pages (e.g., dashboard).
- Performance work that requires architectural rewrites (e.g., switching ORMs, moving to React Server Components for the planning grid). Anything surfaced by the audit that's bigger than a focused fix gets logged as a follow-up, not landed here.

---

## 1. Always-show Sundays + Principal Feasts + Festivals

### Behaviour (the rule, exactly)

For each date `d` in the visible date range `[from, to]`:

- Determine whether `d` is a **qualifying day**:
  - `d` is a Sunday (`getDay(d) === 0`), OR
  - `d` corresponds to a `liturgical_days` row whose lectionary entry has `section === "Festivals"`, OR
  - `d` corresponds to a `liturgical_days` row whose `icalUid` (sundayKey) is in the **Principal Feasts** list (see below).
- For each qualifying day:
  - If the church has any `church_service_patterns` row whose `dayOfWeek === getDay(d)` and `enabled === true`, do nothing extra — the existing `computeGhostRows` logic already produces rows for it.
  - Otherwise, inject a single fallback ghost row with `serviceType = "SUNG_EUCHARIST"` and `time = null`.
- Existing services (real rows) and existing pattern-derived ghost rows continue to behave exactly as today; the fallback row is only added when the day would otherwise produce zero rows.

The fallback ghost row is keyed `ghost:{date}:SUNG_EUCHARIST`, identical in shape to today's ghost rows, so all downstream code (cell editing, save-on-edit promotion to a real service, paste handling, CSV import) works without modification.

### Principal Feasts list (hardcoded)

Stored as a `Set<string>` of sundayKeys, co-located with the existing planning logic:

```
christmas-day
the-epiphany
easter-day
ascension-day
day-of-pentecost-whit-sunday
trinity-sunday
all-saints-day
ash-wednesday
maundy-thursday
good-friday
```

The last three are technically "Principal Holy Days" in the CofE calendar but the user's intent ("all C of E principal services") plainly covers them — they always have a principal-service liturgy.

### Where the logic lives

The existing `computeGhostRows` function in `src/app/(app)/churches/[churchId]/planning/ghost-rows.ts` takes `from`, `to`, `patterns`, `existingServices`. We extend it to also accept:

- `qualifyingDays: Array<{ date: string; sundayKey: string | null; section: string | null }>` — the set of liturgical-day metadata covering the range, sourced from the API response.

After producing pattern-driven ghost rows, the function checks each qualifying day:

- Skip if any real service or pattern-driven ghost already exists for that date.
- Otherwise emit one fallback ghost with `serviceType: "SUNG_EUCHARIST"`, `time: null`.

Determining whether a day is "qualifying" happens in a small pure helper, `isQualifyingDay(date, sundayKey, section)`, easy to unit-test.

### API change

`GET /api/churches/{churchId}/planning?from&to` already returns `days: ApiDay[]` with `id`, `date`, `cwName`, `season`, `colour`. We add the existing `icalUid` (sundayKey) and the section to the projection. The section isn't stored in the DB — we look it up from the lectionary JSON via `icalUid` server-side. The route imports the lectionary JSON anyway through the existing calendar/lectionary modules, so no new disk reads.

```ts
days: Array<{
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;     // = icalUid
  section: string | null;       // looked up from lectionary JSON
}>
```

### Empty state

The `noPatterns` guard in `planning-grid.tsx` (lines 542–554) currently short-circuits to "No service patterns configured for this church." With the new behaviour, even a church with zero patterns will see Sunday + Festival rows. We:

- Remove the `noPatterns` guard.
- Replace it with a small, dismissible inline hint at the top of the grid when the church has zero patterns: *"Tip: configure your church's service patterns to see weekday and additional services here. → Configure patterns"* — a one-line `<Alert>`-style banner using existing components.
- The hint stays only until the church has at least one pattern; not a per-user dismissal.

### Tests

Pure-function tests in `ghost-rows.test.ts` (file already exists — extend it):

- Sunday with no patterns → one SUNG_EUCHARIST fallback row.
- Sunday with a SUNG_EUCHARIST Sunday pattern → no fallback (pattern wins).
- Sunday with a CHORAL_EVENSONG-only Sunday pattern → no fallback (pattern wins, even though no morning service results).
- Tuesday that's Christmas Day, no Tuesday pattern → one SUNG_EUCHARIST fallback row.
- Tuesday that's Christmas Day, with a Tuesday lunchtime pattern → no fallback.
- Plain Tuesday (not Sunday, not Festival, not Principal Feast) → no row from this rule.
- Festival sundayKey on a weekday with no pattern → fallback.
- Existing real service for a Sunday → no fallback (existing service wins).

### Risks / edge cases

- **Date-range performance.** Computing qualifying days for a large range walks each date and joins to liturgical-days metadata. The range default is 6 weeks; even a 12-month range is ~365 lookups. Negligible.
- **Liturgical days not seeded.** If `liturgical_days` doesn't have rows for the range, we still emit Sunday fallbacks (from the day-of-week check) but Festival/Principal-Feast detection silently misses. Acceptable — current behavior is to show no readings either when liturgical days are missing, so this is consistent.
- **Pattern ghost vs. fallback collision.** `existingKey` already de-dupes on `${date}:${serviceType}` for real services; we apply the same key when checking whether to emit a fallback, so a SUNG_EUCHARIST pattern on Sunday won't collide with a SUNG_EUCHARIST fallback.

---

## 2. CSV trigger button alignment

### Problem

`DateRangeControls` (`date-range-controls.tsx:24`) bakes `mb-4` into its outer flex container. The "Import CSV" button (`planning-grid.tsx:571`) sits in a sibling flex with `mb-1`. Because the date controls' inner container has its own bottom margin and extra height (`h-9` inputs vs. `size="sm"` buttons), the rows don't share a baseline.

### Fix

- Remove the `mb-4` from `DateRangeControls`'s outer div; let the parent decide spacing.
- In `planning-grid.tsx`, wrap both `DateRangeControls` and the "Import CSV" button in a single `flex items-center gap-2 mb-3` container with consistent control height (`h-9`).
- Match the date inputs and the "Import CSV" button to the same Button `size="sm"` (already `h-9` per the UI primitive — verify in `src/components/ui/button.tsx`).
- The save-status indicator stays directly below the toolbar.

### Tests

Visual regression isn't worth a snapshot test for this — verify by:

- Loading the planning page in dev, confirming visual alignment.
- Resizing to mobile width — toolbar wraps cleanly.

---

## 3. CSV modal close button

### Problem

`csv-import-modal.tsx:60`: `<Button variant="ghost" size="sm" onClick={onClose}>×</Button>`. Ghost variant has no border and no hover background until hover; the unicode `×` glyph is small and easily missed.

### Fix

- Replace the inner content with `<X aria-hidden="true" className="h-4 w-4" />` from `lucide-react` (already a dependency).
- Use `variant="outline"` (or `secondary`) instead of `ghost` so it has a visible border.
- Add `aria-label="Close"` on the button.
- Bump the click target to a square `h-8 w-8 p-0` for easier hit.
- Position unchanged (top right of the modal header).

### Tests

- Render-test the modal, assert a button with `aria-label="Close"` exists and clicking it calls `onClose`.

---

## 4. Performance pass

### Approach

Two phases: **measure**, then **fix**. We don't guess at fixes — we baseline first, apply targeted changes, re-measure.

### Baseline (measurement)

Captured against a production build (`npm run build && npm start`), not dev:

- Lighthouse runs (mobile + desktop, "Performance" category) for:
  - `/churches` (list view)
  - `/churches/{id}` (overview)
  - `/churches/{id}/planning` (cold) — both with and without configured patterns
  - `/churches/{id}/services`
- Browser network panel snapshots for the same pages: TTFB, total transfer, JS bundle size.
- Manual stopwatch (or `performance.now`) for in-app nav between Overview ↔ Planning ↔ Services.
- Planning grid micro-benchmarks: time from cell focus → visible save status, time to render the grid for a 12-week range, paste-from-spreadsheet latency for a 10×9 paste.

These numbers go into `docs/superpowers/specs/2026-04-27-planning-polish-and-performance-design.md` (this file) under a "Baseline" appendix when measurement runs.

### Targeted fixes (already-identified, high-confidence)

These are the specific issues already visible from code inspection. The audit may surface more.

#### 4a. Auth + membership query deduplication

Today, rendering `/churches/{id}/planning` triggers:

- `(app)/layout.tsx`: `supabase.auth.getUser()`
- `(app)/churches/[churchId]/layout.tsx`: `supabase.auth.getUser()` + DB `users` lookup + DB `churchMemberships+churches` join
- `planning/page.tsx` → `requireChurchRole`: `supabase.auth.getUser()` + DB `users` lookup + DB `churchMemberships` lookup

Three Supabase auth round-trips and four DB queries before the page even runs its own logic, all duplicates.

**Fix:** wrap `getAuthUser()` (in `src/lib/auth/permissions.ts`) and the membership lookup in `React.cache(...)`. React's `cache` deduplicates within a single server-render request, so the layout and page share results from a single round-trip each.

```ts
import { cache } from "react";

export const getAuthUser = cache(async () => { ... });
export const getChurchMembership = cache(async (userId: string, churchId: string) => { ... });
```

`requireChurchRole` and the layouts compose those cached fns. No behavioural change; no caching across requests; no security implications.

#### 4b. Planning grid initial fetch

`planning-grid.tsx` is a client component that `useEffect`-fetches `/api/churches/{id}/planning` on mount, showing a "Loading grid…" message until the request completes.

**Fix:** server-render the initial response in `planning/page.tsx` and pass it as a prop to `PlanningGrid`. The grid stays a client component for interactivity but skips the cold round-trip. Client-side refetch on date-range change still uses the API route as today.

```ts
// page.tsx
const initialData = await fetchPlanningData(churchId, from, to);
return <PlanningGrid churchId={...} from={...} to={...} initialData={initialData} />;
```

The fetch logic is extracted into a shared module (`planning/data.ts` or similar) so it's callable from both the API route and the page.

#### 4c. PlanningCell memoization

The grid re-renders all cells on every state change (focus, save status, every keystroke commit). For typical 6-week ranges this is fine; for 12-week or paste operations it's noticeable.

**Fix:** wrap `PlanningCell` in `React.memo` with a custom equality check that compares `value`, `focused`, `editing`, and `serviceType`. Other props (callbacks) need stable references — wrap them in `useCallback` in `PlanningGrid` or thread them through a context.

#### 4d. Sidebar layout query slimming

`(app)/churches/[churchId]/layout.tsx` selects the entire `churches` row + entire `churchMemberships` row. The sidebar uses `church.name` and `membership.role`. Trim the projection to just those columns; reduces row size and parses fewer cells.

#### 4e. Bundle audit

Run `ANALYZE=true npm run build` (after adding `@next/bundle-analyzer` to dev deps if not present, or use Next 16's built-in). Confirm:

- `lectionary-coe.json` (448K) and `lectionary-readings-text.json` (2.3M) appear in **server** chunks only, never in client chunks.
- `lucide-react` is tree-shaken — only imported icons in each client chunk.
- No accidental large deps (e.g., a full `date-fns` build instead of named imports — there's evidence of named imports throughout, but verify).
- No duplicate chunks for shared client components.

Action items from the audit are filed inline if small; larger items become follow-ups.

#### 4f. Link prefetching sanity check

Sweep client components for `<a href>` usages that should be `<Link>` for prefetching. Specifically `church-sidebar.tsx` and any nav helpers. Prefetching is on by default in Next 16 — we just need to ensure `<Link>` is used.

### Things explicitly out of scope here

- Caching at the HTTP layer (e.g., `Cache-Control` on API routes). Worth doing later but needs a per-route invalidation story we don't yet have.
- React Compiler / `useMemo` of the cell-derivation functions in `planning-grid.tsx` — only worth it if the bundle audit shows they're hot.
- Switching the planning grid to a virtualized list — not needed at current data sizes; revisit if Lighthouse / paint times indicate a problem.

### Tests

- Existing test suites (`vitest`, Playwright) must continue to pass.
- Add a vitest test for `React.cache` dedup of `getAuthUser` (mock the supabase client and assert it's called once across two `getAuthUser()` invocations within a single render).
- Manual end-to-end verification per the baseline checklist above; captured numbers logged in this doc.

---

## Sequencing

Single implementation plan, but the work splits into independent commits:

1. CSV modal × button (smallest; no shared code with anything else).
2. Toolbar alignment (small; only touches `date-range-controls.tsx` + `planning-grid.tsx` toolbar block).
3. Always-show Sundays + Festivals + Principal Feasts (touches API route, ghost-rows, planning-grid, tests).
4. Auth dedup via `React.cache` (touches `lib/auth/permissions.ts` + the two layouts).
5. Planning grid server-side initial render (extracts data fetch, page becomes async, grid takes `initialData`).
6. `PlanningCell` memoization + callback stability.
7. Sidebar layout query slimming.
8. Bundle audit + targeted fixes from findings.
9. Re-measure baseline; record numbers.

Each is reviewable and revertable.

## Acceptance criteria

- A new church (zero patterns, zero services) opening planning at any date range sees a ghost row for every Sunday and every Festival/Principal Feast in range.
- A church with patterns sees existing behaviour for any day-of-week the patterns cover; sees a SUNG_EUCHARIST fallback row only on Sundays / Festivals / Principal Feasts where the patterns produce nothing.
- The CSV trigger button shares a baseline with the date inputs and 4-weeks/Term buttons.
- The CSV modal close button is visibly distinct, has `aria-label="Close"`, and uses an icon, not the unicode `×`.
- Lighthouse Performance scores improve (or do not regress) on `/churches/{id}/planning` and `/churches/{id}` between baseline and post-fix runs.
- Cold-load wall-clock time on `/churches/{id}/planning` (production build, no cache) drops by a measurable amount; numbers recorded in the spec.
- All existing vitest + Playwright tests pass.
