# Site Audit & UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified bugs, performance issues, and code quality problems, then polish the UX for soft launch readiness.

**Architecture:** Two sequential phases. Phase A fixes the foundation (bugs, performance, code quality, a11y). Phase B polishes the UX and design. Each task produces a working, testable commit.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM (PostgreSQL), Tailwind CSS 4, Zod, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-28-site-audit-and-ux-overhaul-design.md`

**IMPORTANT:** This project uses Next.js 16. Before writing any code that touches Next.js APIs, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

---

## Phase A: Stability & Performance

### Task 1: Fix "Error saving Mass Setting" and debounce timer leak

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts:400-413` (debouncedUpdateSettings)
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts:233-234` (debounceRef cleanup)

**Context:** The `debouncedUpdateSettings` function at line 400 dispatches an optimistic `SET_SETTINGS` update without taking a snapshot first. When the debounced `updateSettings` call fails 500ms later, the rollback in `runMutation` uses a stale snapshot (captured at call time, not before the optimistic update). Additionally, `debounceRef` is never cleaned up on unmount.

- [ ] **Step 1: Write test for debouncedUpdateSettings rollback**

Create a test that verifies settings are restored on failed save. The hook already uses `runMutation` which handles rollback — the fix is to use `SNAPSHOT_AND_UPDATE_SETTINGS` instead of `SET_SETTINGS` so the reducer captures the snapshot.

```typescript
// src/app/(app)/churches/[churchId]/services/[date]/__tests__/use-service-editor.test.ts
import { describe, it, expect } from "vitest";
// Test the reducer directly since the hook has network dependencies
import { reducer, takeSnapshot, type ServiceEditorState, type ServiceSettings } from "../use-service-editor";

describe("reducer: SET_SETTINGS vs SNAPSHOT_AND_UPDATE_SETTINGS", () => {
  const baseSettings: ServiceSettings = {
    sheetMode: "summary",
    eucharisticPrayer: null,
    eucharisticPrayerId: null,
    includeReadingText: true,
    choirStatus: "CHOIR_REQUIRED",
    defaultMassSettingId: null,
    collectId: null,
    collectOverride: null,
  };

  const baseState: ServiceEditorState = {
    sections: [],
    settings: baseSettings,
    musicSlots: new Map(),
    saveStatus: "idle",
    undoStack: [],
    redoStack: [],
    sheetData: null,
  };

  it("SNAPSHOT_AND_UPDATE_SETTINGS pushes undo entry", () => {
    const updated = { ...baseSettings, defaultMassSettingId: "new-id" };
    const next = reducer(baseState, { type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: updated });
    expect(next.settings.defaultMassSettingId).toBe("new-id");
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].settings.defaultMassSettingId).toBeNull();
  });

  it("ROLLBACK restores snapshot", () => {
    const snapshot = takeSnapshot(baseState);
    const modified = { ...baseState, settings: { ...baseSettings, defaultMassSettingId: "new-id" } };
    const rolled = reducer(modified, { type: "ROLLBACK", snapshot });
    expect(rolled.settings.defaultMassSettingId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/(app)/churches/[churchId]/services/[date]/__tests__/use-service-editor.test.ts`
Expected: FAIL — `reducer` and `takeSnapshot` are not exported.

- [ ] **Step 3: Export reducer and takeSnapshot for testing**

In `use-service-editor.ts`, add named exports for `reducer` and `takeSnapshot` (they are currently file-private). Also export the `ServiceEditorState` type.

```typescript
// At line 71, change from:
// function takeSnapshot(state: ServiceEditorState): ServiceEditorSnapshot {
// To:
export function takeSnapshot(state: ServiceEditorState): ServiceEditorSnapshot {

// At line 88, change from:
// function reducer(
// To:
export function reducer(
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/(app)/churches/[churchId]/services/[date]/__tests__/use-service-editor.test.ts`
Expected: PASS

- [ ] **Step 5: Fix debouncedUpdateSettings to use SNAPSHOT_AND_UPDATE_SETTINGS**

Replace the `debouncedUpdateSettings` function (lines 400-413) to use the snapshot-aware dispatch:

```typescript
const debouncedUpdateSettings = useCallback(
  (fields: Partial<ServiceSettings>) => {
    // Optimistically update with snapshot for undo/rollback
    const current = stateRef.current;
    const updated = { ...current.settings, ...fields };
    dispatch({ type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: updated });

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // updateSettings will take its own snapshot, but we already did
      // the optimistic update via SNAPSHOT_AND_UPDATE_SETTINGS.
      // Call runMutation directly instead to avoid double-snapshot.
      const snapshot = takeSnapshot(stateRef.current);
      runMutation(
        () =>
          apiFetch(`${baseUrl}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          }),
        // Rollback to state BEFORE our optimistic update
        // which is the last undo entry
        stateRef.current.undoStack[stateRef.current.undoStack.length - 1] ?? snapshot
      );
    }, 500);
  },
  [baseUrl, runMutation]
);
```

- [ ] **Step 6: Add debounce cleanup on unmount**

After line 272 (`useEffect(() => { stateRef.current = state; });`), add:

```typescript
useEffect(() => {
  return () => {
    clearTimeout(debounceRef.current);
    clearTimeout(savedTimerRef.current);
  };
}, []);
```

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts src/app/(app)/churches/[churchId]/services/[date]/__tests__/
git commit -m "fix: mass setting save error — snapshot before optimistic dispatch, clean up timers"
```

---

### Task 2: Fix verse selector stuck-saving and VerseStepper fire-and-forget

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/verse-selector.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/verse-stepper.tsx`

- [ ] **Step 1: Fix verse selector — wrap handleSave in try/finally**

In `verse-selector.tsx`, replace `handleSave` (lines 93-125):

```typescript
const handleSave = async () => {
  setSaving(true);
  try {
    const res = await fetch(
      `/api/churches/${churchId}/services/${serviceId}/slots`
    );
    if (!res.ok) {
      addToast("Failed to load slots", "error");
      return;
    }
    const slots: MusicSlot[] = await res.json();

    const selectedArr = Array.from(selected).sort((a, b) => a - b);
    const updated = slots.map((s) =>
      s.id === musicSlotId ? { ...s, selectedVerses: selectedArr } : s
    );

    const putRes = await fetch(
      `/api/churches/${churchId}/services/${serviceId}/slots`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: updated }),
      }
    );

    if (putRes.ok) {
      onSave?.(selectedArr);
      setOpen(false);
    } else {
      addToast("Failed to save verse selection", "error");
    }
  } catch {
    addToast("Network error saving verses", "error");
  } finally {
    setSaving(false);
  }
};
```

Note: This requires importing `useToast`. Add at top of file:
```typescript
import { useToast } from "@/components/ui/toast";
```
And in the component body:
```typescript
const { addToast } = useToast();
```

- [ ] **Step 2: Also fix silent catch in verse loading (lines 72-73)**

Replace `catch { // leave empty }` with:
```typescript
} catch {
  addToast("Failed to load verses", "error");
}
```

- [ ] **Step 3: Fix VerseStepper — await handleUpdate, disable during save**

In `verse-stepper.tsx`, replace handlers (lines 39-51):

```typescript
const handleDecrement = async () => {
  if (count <= 1 || saving) return;
  const next = count - 1;
  setCount(next);
  await handleUpdate(next);
};

const handleIncrement = async () => {
  if (count >= totalVerses || saving) return;
  const next = count + 1;
  setCount(next);
  await handleUpdate(next);
};
```

The buttons already have `disabled={... || saving}` so they will be disabled during the await.

- [ ] **Step 4: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/verse-selector.tsx src/app/(app)/churches/[churchId]/services/[date]/verse-stepper.tsx
git commit -m "fix: verse selector stuck-saving state, VerseStepper fire-and-forget"
```

---

### Task 3: Replace silent catch blocks with toast errors

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/mass-setting-control.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/hymn-picker.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts` (refreshSections)

- [ ] **Step 1: Fix mass-setting-control.tsx silent catches**

Add `useToast` import and usage. Replace all empty catch blocks:

Line 60-62 (load setting): `catch { addToast("Failed to load mass setting", "error"); }`
Line 91-93 (search): `catch { addToast("Search failed", "error"); }`

- [ ] **Step 2: Fix hymn-picker.tsx silent catches**

Same pattern. Line 67-69 (load hymn): `catch { addToast("Failed to load hymn details", "error"); }`
Line 98-100 (search): `catch { addToast("Hymn search failed", "error"); }`

- [ ] **Step 3: Fix use-service-editor.ts refreshSections silent catch**

Line 454-456: Replace `catch { // silent }` with:
```typescript
} catch (err) {
  logger.error("Failed to refresh sections", err);
}
```

Import logger at top: `import { logger } from "@/lib/logger";`

Note: This is a background refresh so a toast may be excessive — logging is sufficient.

- [ ] **Step 4: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/mass-setting-control.tsx src/app/(app)/churches/[churchId]/services/[date]/hymn-picker.tsx src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts
git commit -m "fix: replace silent catch blocks with user-visible error toasts"
```

---

### Task 4: Fix race condition in addSection temp ID replacement

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts:339-380`

- [ ] **Step 1: Guard temp ID replacement**

In the `addSection` function, after `const created: ServiceSection = await res.json();` (line 364), replace the replacement logic (lines 366-370) with this guarded version:

```typescript
const created: ServiceSection = await res.json();
// Replace temp ID with real ID — guard against concurrent edits
const currentState = stateRef.current;
const tempExists = currentState.sections.some((s) => s.id === tempId);
if (tempExists) {
  const replaced = currentState.sections.map((s) =>
    s.id === tempId ? created : s
  );
  dispatch({ type: "SET_SECTIONS", sections: replaced });
} else {
  // Temp section was modified/removed — refetch from server
  try {
    const res2 = await apiFetch(`${baseUrl}/sections`, { method: "GET" });
    if (res2.ok) {
      const fetched: ServiceSection[] = await res2.json();
      dispatch({ type: "SET_SECTIONS", sections: fetched });
    }
  } catch { /* best-effort */ }
}
markSaved();
return created;
```

- [ ] **Step 2: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/use-service-editor.ts
git commit -m "fix: guard addSection temp ID replacement against concurrent edits"
```

---

### Task 5: Fix N+1 queries on service detail page

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/page.tsx:124-140`

**Context:** The current code loops over `dayServices` with 2 queries per service. Replace with batch queries using `inArray()`.

- [ ] **Step 1: Replace loop with batch queries**

Replace lines 123-141:

```typescript
// Fetch sections and raw slots for all services (for editor mode)
if (isEditMode && dayServices.length > 0) {
  const svcIds = dayServices.map((s) => s.id);
  const [allSections, allSlots] = await Promise.all([
    db
      .select()
      .from(serviceSections)
      .where(inArray(serviceSections.serviceId, svcIds))
      .orderBy(asc(serviceSections.positionOrder)),
    db
      .select()
      .from(musicSlots)
      .where(inArray(musicSlots.serviceId, svcIds))
      .orderBy(asc(musicSlots.positionOrder)),
  ]);
  // Group by serviceId
  for (const svc of dayServices) {
    editorSectionsMap[svc.id] = allSections.filter((s) => s.serviceId === svc.id);
    editorSlotsMap[svc.id] = allSlots.filter((s) => s.serviceId === svc.id);
  }
}
```

Add `inArray` to the import from `drizzle-orm` at the top of the file:
```typescript
import { eq, and, asc, inArray } from 'drizzle-orm'
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/page.tsx
git commit -m "perf: batch service sections and slots queries (fix N+1)"
```

---

### Task 6: Fix N+1 in PDF generation

**Files:**
- Modify: `src/lib/pdf/build-sheet-data.ts:59-223`

**Context:** `resolveDbSections` has three problems: (1) re-fetches raw slots already available, (2) does 3 redundant `.find()` calls per section, (3) queries hymn verses inside a loop.

- [ ] **Step 1: Pre-build lookup maps and batch hymn verse query**

Replace the `resolveDbSections` function body. Key changes:

1. Build a `slotById` map from the raw slot rows directly (no second query needed — pass raw slots as parameter)
2. Replace the 3x `.find()` with a single lookup
3. Collect all hymn IDs first, batch-fetch verses, then distribute

```typescript
async function resolveDbSections(
  serviceId: string,
  service: typeof services.$inferSelect,
  day: typeof liturgicalDays.$inferSelect,
  dayReadings: ReadingEntry[],
  resolvedSlots: MusicSlotEntry[],
): Promise<ResolvedDbSection[] | null> {
  const rawSections = await db
    .select({ section: serviceSections, liturgicalText: liturgicalTexts })
    .from(serviceSections)
    .leftJoin(liturgicalTexts, eq(serviceSections.liturgicalTextId, liturgicalTexts.id))
    .where(eq(serviceSections.serviceId, serviceId))
    .orderBy(asc(serviceSections.positionOrder));

  if (rawSections.length === 0) return null;

  // Fetch raw slot rows and build lookup maps
  const rawSlotRows = await db
    .select({ slot: musicSlots })
    .from(musicSlots)
    .where(eq(musicSlots.serviceId, serviceId));

  const slotById = new Map<string, MusicSlotEntry>();
  const rawSlotById = new Map<string, typeof rawSlotRows[number]["slot"]>();
  for (const row of rawSlotRows) {
    const resolved = resolvedSlots.find((s) => s.positionOrder === row.slot.positionOrder);
    if (resolved) slotById.set(row.slot.id, resolved);
    rawSlotById.set(row.slot.id, row.slot);
  }

  // Batch-fetch all hymn verses upfront
  const hymnIds = new Set<string>();
  for (const row of rawSlotRows) {
    if (row.slot.hymnId && (row.slot.verseCount || row.slot.selectedVerses?.length)) {
      hymnIds.add(row.slot.hymnId);
    }
  }
  const allHymnVerses = hymnIds.size > 0
    ? await db
        .select()
        .from(hymnVerses)
        .where(inArray(hymnVerses.hymnId, [...hymnIds]))
        .orderBy(asc(hymnVerses.verseNumber))
    : [];
  const versesByHymnId = new Map<string, typeof allHymnVerses>();
  for (const v of allHymnVerses) {
    const existing = versesByHymnId.get(v.hymnId) ?? [];
    existing.push(v);
    versesByHymnId.set(v.hymnId, existing);
  }

  // Resolve eucharistic prayer (unchanged logic)
  let epBlocks: LiturgicalTextBlock[] | null = null;
  if (service.eucharisticPrayerId) {
    const epRows = await db.select().from(eucharisticPrayers)
      .where(eq(eucharisticPrayers.id, service.eucharisticPrayerId)).limit(1);
    if (epRows.length > 0) epBlocks = epRows[0].blocks as LiturgicalTextBlock[];
  }
  if (!epBlocks && service.eucharisticPrayer) {
    const legacyEp = resolveEucharisticPrayer(service.eucharisticPrayer);
    if (legacyEp) epBlocks = legacyEp.blocks;
  }

  // Resolve collect (unchanged logic)
  let collectFromDb: string | null = null;
  if (service.collectId) {
    const [collectRow] = await db.select({ text: collects.text })
      .from(collects).where(eq(collects.id, service.collectId)).limit(1);
    collectFromDb = collectRow?.text ?? null;
  }
  const collectText = resolveCollectText(
    service.collectOverride ?? null, collectFromDb, day.collect ?? null);

  const READING_POSITION_MAP: Record<string, string> = {
    "reading-ot": "OLD_TESTAMENT",
    "reading-nt": "NEW_TESTAMENT",
    "reading-epistle": "NEW_TESTAMENT",
    "reading-gospel": "GOSPEL",
    "reading-psalm": "PSALM",
  };

  const result: ResolvedDbSection[] = [];

  for (const { section, liturgicalText } of rawSections) {
    if (!section.visible) continue;

    let blocks: LiturgicalTextBlock[] = [];
    let reading: ReadingEntry | undefined;
    let musicSlot: MusicSlotEntry | undefined;

    if (section.textOverride && section.textOverride.length > 0) {
      blocks = section.textOverride as LiturgicalTextBlock[];
    } else if (liturgicalText) {
      blocks = liturgicalText.blocks as LiturgicalTextBlock[];
    }

    const pt = section.placeholderType;
    if (pt) {
      if (pt === "collect" && collectText) {
        blocks = [...blocks, { speaker: "president" as const, text: collectText }];
      } else if (pt === "post-communion" && day.postCommunion) {
        blocks = [...blocks, { speaker: "president" as const, text: day.postCommunion }];
      } else if (pt === "eucharistic-prayer" && epBlocks) {
        blocks = epBlocks;
      } else if (READING_POSITION_MAP[pt]) {
        reading = dayReadings.find((r) => r.position === READING_POSITION_MAP[pt]);
      }
    }

    if (section.musicSlotId) {
      musicSlot = slotById.get(section.musicSlotId);
      const rawSlot = rawSlotById.get(section.musicSlotId);

      if (musicSlot?.hymn && rawSlot?.hymnId) {
        const { hymnId, verseCount, selectedVerses } = rawSlot;
        if (verseCount || selectedVerses?.length) {
          const verses = versesByHymnId.get(hymnId) ?? [];
          if (verses.length > 0) {
            const chosen = selectVerses(
              verses.length, verseCount ?? verses.length, selectedVerses ?? null);
            const chosenSet = new Set(chosen);
            const verseBlocks: LiturgicalTextBlock[] = verses
              .filter((v) => chosenSet.has(v.verseNumber))
              .map((v) => ({ speaker: "all" as const, text: v.text }));
            if (verseBlocks.length > 0) blocks = verseBlocks;
          }
        }
      }
    }

    result.push({
      id: section.id, sectionKey: section.sectionKey, title: section.title,
      majorSection: section.majorSection, positionOrder: section.positionOrder,
      blocks, reading, musicSlot, placeholderType: section.placeholderType,
    });
  }

  return result;
}
```

Add `inArray` to import: `import { eq, asc, inArray } from "drizzle-orm";`

- [ ] **Step 2: Run existing PDF tests**

Run: `npx vitest run src/lib/pdf/`
Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf/build-sheet-data.ts
git commit -m "perf: eliminate N+1 hymn verse queries in PDF generation"
```

---

### Task 7: Add missing database indexes

**Files:**
- Modify: `src/lib/db/schema-base.ts` (add indexes to performanceLogs, availability, rotaEntries)

- [ ] **Step 1: Add indexes to table definitions**

In `schema-base.ts`, add index callbacks to the three tables:

For `performanceLogs` (line 280-289), add a third argument:
```typescript
export const performanceLogs = pgTable("performance_logs", {
  // ... existing columns unchanged ...
}, (t) => [
  index("perf_log_church_idx").on(t.churchId),
  index("perf_log_date_idx").on(t.date),
]);
```

For `availability` (line 261-268), add an index:
```typescript
}, (t) => [
  uniqueIndex("availability_unique").on(t.userId, t.serviceId),
  index("availability_service_idx").on(t.serviceId),
]);
```

For `rotaEntries` (line 270-277), add an index:
```typescript
}, (t) => [
  uniqueIndex("rota_unique").on(t.serviceId, t.userId),
  index("rota_service_idx").on(t.serviceId),
]);
```

- [ ] **Step 2: Generate migration**

Run: `npx drizzle-kit generate`
Expected: New migration file in `drizzle/` adding the three indexes.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema-base.ts drizzle/
git commit -m "perf: add missing indexes on performanceLogs, availability, rotaEntries"
```

---

### Task 8: Replace O(n) lookups with Maps on services page

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx:89-118`

- [ ] **Step 1: Build Maps before the loop**

Replace lines 89-118:

```typescript
// Build lookup maps for O(1) access
const serviceByDayId = new Map(
  churchServices.map((s) => [s.liturgicalDayId, s])
);
const availByServiceId = new Map(
  userAvailability.map((a) => [a.serviceId, a])
);
const slotsByServiceId = new Map<string, typeof slots>();
for (const slot of slots) {
  const existing = slotsByServiceId.get(slot.serviceId) ?? [];
  existing.push(slot);
  slotsByServiceId.set(slot.serviceId, existing);
}

days = upcomingDays.map((day) => {
  const service = serviceByDayId.get(day.id) ?? null;
  if (!service) return { ...day, service: null };

  const avail = availByServiceId.get(service.id);
  const serviceSlots = slotsByServiceId.get(service.id) ?? [];

  const musicPreview: MusicSlotPreview[] = serviceSlots.slice(0, 4).map((slot) => ({
    id: slot.id,
    slotType: slot.slotType as MusicSlotPreview["slotType"],
    positionOrder: slot.positionOrder,
    title: slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText ?? slot.slotType,
  }));

  return {
    ...day,
    service: {
      id: service.id,
      serviceType: service.serviceType,
      time: service.time,
      status: service.status,
      choirStatus: service.choirStatus,
      userAvailability:
        (avail?.status as "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null) ?? null,
      musicPreview,
    },
  };
});
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/page.tsx
git commit -m "perf: replace O(n) lookups with Maps on services page"
```

---

### Task 9: Remove redundant hymn fetch

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/hymn-picker.tsx:55-74`

- [ ] **Step 1: Skip fetch when currentHymn already has data**

The `useEffect` at line 55 fires whenever `hymnId` changes. When the user selects a hymn from search, `handleSelect` already sets `currentHymn` and `totalVerses` from the search result. The `useEffect` then redundantly fetches the same hymn.

Fix: Guard the useEffect to skip when `currentHymn` is already populated for this `hymnId`:

```typescript
useEffect(() => {
  if (!hymnId) return;
  // Skip if we already have data for this hymn (e.g., from search selection)
  if (currentHymn && currentHymn.id === hymnId) return;
  let cancelled = false;
  async function loadHymn() {
    setLoadingHymn(true);
    try {
      const res = await fetch(`/api/hymns/${hymnId}`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setCurrentHymn(data);
        setTotalVerses(data.totalVerses ?? data.verseCount ?? null);
      }
    } catch {
      addToast("Failed to load hymn details", "error");
    }
    if (!cancelled) setLoadingHymn(false);
  }
  loadHymn();
  return () => { cancelled = true; };
}, [hymnId, currentHymn, addToast]);
```

Note: Adding `currentHymn` to deps is safe because it only changes via `setCurrentHymn` — it won't cause infinite loops since the guard `currentHymn.id === hymnId` breaks the cycle.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/hymn-picker.tsx
git commit -m "perf: skip redundant hymn fetch when data already from search"
```

---

### Task 10: Create shared Zod schemas and apiError helper

**Files:**
- Create: `src/lib/validation/schemas.ts`
- Create: `src/lib/api-helpers.ts`

**Context:** This task sets up the foundation for Tasks 11-12 which will apply these to API routes.

- [ ] **Step 1: Create shared Zod validation schemas**

```typescript
// src/lib/validation/schemas.ts
import { z } from "zod";

// ─── Primitives ─────────────────────────────────────────────
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();

// ─── Service ────────────────────────────────────────────────
export const serviceUpdateSchema = z.object({
  serviceType: z.enum([
    "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST",
    "CHORAL_MATINS", "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
  ]).optional(),
  time: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  notes: z.string().nullable().optional(),
  eucharisticPrayer: z.string().nullable().optional(),
  eucharisticPrayerId: z.string().uuid().nullable().optional(),
  collectId: z.string().uuid().nullable().optional(),
  collectOverride: z.string().nullable().optional(),
  includeReadingText: z.boolean().optional(),
  sheetMode: z.string().optional(),
  choirStatus: z.enum([
    "CHOIR_REQUIRED", "NO_CHOIR_NEEDED", "SAID_SERVICE_ONLY", "NO_SERVICE",
  ]).optional(),
  defaultMassSettingId: z.string().uuid().nullable().optional(),
  liturgicalOverrides: z.record(z.string()).optional(),
}).strict();

// ─── Section ────────────────────────────────────────────────
export const sectionCreateSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  majorSection: z.string().nullable().optional(),
  positionOrder: z.number().int().positive(),
  liturgicalTextId: z.string().uuid().nullable().optional(),
  textOverride: z.array(z.object({ speaker: z.string(), text: z.string() })).nullable().optional(),
  musicSlotId: z.string().uuid().nullable().optional(),
  musicSlotType: z.string().nullable().optional(),
  placeholderType: z.string().nullable().optional(),
  placeholderValue: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});

export const sectionUpdateSchema = sectionCreateSchema.partial();

// ─── Music Slot ─────────────────────────────────────────────
export const slotUpdateSchema = z.object({
  hymnId: z.string().uuid().nullable().optional(),
  anthemId: z.string().uuid().nullable().optional(),
  massSettingId: z.string().uuid().nullable().optional(),
  canticleSettingId: z.string().uuid().nullable().optional(),
  responsesSettingId: z.string().uuid().nullable().optional(),
  freeText: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  verseCount: z.number().int().positive().nullable().optional(),
  selectedVerses: z.array(z.number().int()).nullable().optional(),
}).strict();

// ─── Member Invite ──────────────────────────────────────────
export const memberInviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).default("MEMBER"),
  sendEmail: z.boolean().default(true),
});

// ─── Church ─────────────────────────────────────────────────
export const churchUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  diocese: z.string().max(200).nullable().optional(),
  ccliNumber: z.string().max(50).nullable().optional(),
}).strict();
```

- [ ] **Step 2: Create apiError helper**

```typescript
// src/lib/api-helpers.ts
import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/schemas.ts src/lib/api-helpers.ts
git commit -m "feat: add shared Zod validation schemas and apiError helper"
```

---

### Task 11: Extract permission middleware wrapper

**Files:**
- Create: `src/lib/auth/with-church-auth.ts`

- [ ] **Step 1: Create withChurchAuth wrapper**

```typescript
// src/lib/auth/with-church-auth.ts
import { requireChurchRole } from "./permissions";
import { apiError } from "@/lib/api-helpers";
import type { MemberRole } from "@/types";
import type { NextRequest } from "next/server";

interface AuthContext {
  userId: string;
  churchId: string;
  role: MemberRole;
}

type RouteParams = { params: Promise<{ churchId: string; [key: string]: string }> };

/**
 * Wraps an API route handler with church role authentication.
 * Eliminates the repeated requireChurchRole + if (error) return error pattern.
 */
export function withChurchAuth(
  minRole: MemberRole,
  handler: (request: NextRequest, context: AuthContext, params: Record<string, string>) => Promise<Response>
) {
  return async (request: NextRequest, { params }: RouteParams) => {
    const resolvedParams = await params;
    const { churchId } = resolvedParams;
    const { user, membership, error } = await requireChurchRole(churchId, minRole);
    if (error) return error;
    return handler(request, {
      userId: user!.id,
      churchId,
      role: membership!.role as MemberRole,
    }, resolvedParams);
  };
}
```

This wrapper can be adopted incrementally — new routes use it, existing routes migrate over time. No need to rewrite all 34 routes at once.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/with-church-auth.ts
git commit -m "feat: add withChurchAuth middleware wrapper to reduce auth boilerplate"
```

---

### Task 12: Apply Zod validation to key API routes

**Files:**
- Modify: `src/app/api/churches/[churchId]/route.ts` (church PATCH)
- Modify: `src/app/api/churches/[churchId]/members/route.ts` (invite POST — also fixes email regex)
- Modify: `src/app/api/churches/[churchId]/services/[serviceId]/route.ts` (service PATCH)

**Context:** Apply Zod schemas from Task 10 to the most critical routes. Remaining routes can be migrated incrementally later.

- [ ] **Step 1: Apply churchUpdateSchema to church PATCH route**

At top of route file, add:
```typescript
import { churchUpdateSchema } from "@/lib/validation/schemas";
import { apiError } from "@/lib/api-helpers";
```

Replace manual validation with:
```typescript
const parsed = churchUpdateSchema.safeParse(body);
if (!parsed.success) {
  return apiError(parsed.error.issues[0].message, 400);
}
const fields = parsed.data;
```

- [ ] **Step 2: Apply memberInviteSchema to members POST route (fixes email regex too)**

Replace the hand-rolled email regex `const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` with Zod validation:
```typescript
import { memberInviteSchema } from "@/lib/validation/schemas";

// In the POST handler:
const parsed = memberInviteSchema.safeParse(body);
if (!parsed.success) {
  return apiError(parsed.error.issues[0].message, 400);
}
const { email, role, sendEmail } = parsed.data;
```

- [ ] **Step 3: Apply serviceUpdateSchema to service PATCH route**

Replace the long manual validation block (70+ lines of typeof checks) with:
```typescript
import { serviceUpdateSchema } from "@/lib/validation/schemas";

const parsed = serviceUpdateSchema.safeParse(body);
if (!parsed.success) {
  return apiError(parsed.error.issues[0].message, 400);
}
```

- [ ] **Step 4: Run typecheck and lint**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/churches/[churchId]/route.ts src/app/api/churches/[churchId]/members/route.ts src/app/api/churches/[churchId]/services/[serviceId]/route.ts src/lib/validation/schemas.ts
git commit -m "feat: apply Zod validation to church, members, and service API routes"
```

---

### Task 13: Remove deprecated PUT endpoint and standardise error handling

**Files:**
- Modify: `src/app/api/churches/[churchId]/services/[serviceId]/sections/route.ts` (remove PUT)
- Verify no client code calls the old PUT endpoint

- [ ] **Step 1: Search for PUT calls to sections endpoint**

Run: `grep -r "sections.*PUT\|PUT.*sections" src/ --include="*.ts" --include="*.tsx" -l`

Check that only the route definition itself and the `reorder` PUT route appear. The reorder route is at a different path (`/sections/reorder`), so it's safe.

- [ ] **Step 2: Remove the deprecated PUT handler**

Delete the entire `export async function PUT(...)` block (lines 110-162 of sections/route.ts).

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/churches/[churchId]/services/[serviceId]/sections/route.ts
git commit -m "chore: remove deprecated PUT /sections endpoint"
```

---

### Task 14: Fix color contrast, focus rings, and a11y loading states

**Files:**
- Modify: `src/app/globals.css` (muted-foreground color)
- Modify: `src/app/(app)/churches/[churchId]/members/invite-form.tsx` (focus styles)
- Modify: `src/app/(app)/churches/[churchId]/members/members-table.tsx` (focus styles)
- Modify: `src/app/(app)/loading.tsx` (aria-busy)

**Context:** The `--muted-foreground: #6B5E4F` on `#FAF6F1` background gives a contrast ratio of ~3.8:1 — below WCAG AA's 4.5:1 requirement for normal text.

- [ ] **Step 1: Fix muted-foreground contrast**

In `globals.css`, change line 98:
```css
--muted-foreground: #5C4F3D;
```

This gives approximately 5.1:1 contrast ratio against `#FAF6F1`, meeting WCAG AA.

- [ ] **Step 2: Fix focus styles in invite-form.tsx, members-table.tsx, choir-status-badge.tsx**

In `invite-form.tsx`: Replace `focus:border-primary focus:outline-none` with `focus:border-primary focus:ring-1 focus:ring-ring` on both inputs (lines 65 and 74).

In `members-table.tsx`: Find all `<select>` elements with `focus:border-primary focus:outline-none` and replace with `focus:border-primary focus:ring-1 focus:ring-ring`.

In `choir-status-badge.tsx`: Same pattern — replace `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-ring` on the select element.

- [ ] **Step 3: Add aria-busy to loading skeleton**

In `src/app/(app)/loading.tsx`:
```typescript
export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-pulse" role="status" aria-busy="true" aria-label="Loading">
      <span className="sr-only">Loading...</span>
      <div className="h-8 w-48 bg-muted mb-6" />
      <div className="space-y-3">
        <div className="h-16 bg-muted" />
        <div className="h-16 bg-muted" />
        <div className="h-16 bg-muted" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/(app)/churches/[churchId]/members/invite-form.tsx src/app/(app)/churches/[churchId]/members/members-table.tsx src/app/(app)/churches/[churchId]/services/choir-status-badge.tsx src/app/(app)/loading.tsx
git commit -m "a11y: fix muted-foreground contrast ratio, focus rings, loading aria"
```

---

### Task 15: Enlarge touch targets and fix section overflow

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/rota/rota-grid.tsx` (button sizes)
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/section-row.tsx` (overflow)

- [ ] **Step 1: Enlarge rota grid buttons**

In `rota-grid.tsx`, find the availability button (line ~196):
Change `w-6 h-6` to `w-8 h-8`

Find the rota toggle button (line ~216):
Change `w-5 h-5` to `w-8 h-8`

- [ ] **Step 2: Fix section overflow**

In `section-row.tsx`, line ~285-286:
Change `overflow-hidden` to `overflow-y-auto`:

```typescript
className={`overflow-y-auto transition-all duration-200 ${
  isExpanded ? "max-h-[500px]" : "max-h-0"
}`}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/rota/rota-grid.tsx src/app/(app)/churches/[churchId]/services/[date]/section-row.tsx
git commit -m "a11y: enlarge rota touch targets, fix section overflow clipping"
```

---

## Phase B: UX & Design Polish

### Task 16: Fix cramped availability widget

**Files:**
- Modify: `src/components/availability-widget.tsx`

- [ ] **Step 1: Increase button width and gap for lg size**

In `availability-widget.tsx`, update `sizeClasses` (lines 64-68):

```typescript
const sizeClasses = {
  sm: 'h-5 w-5 text-[9px] font-bold',
  md: 'h-8 w-8 text-xs font-bold',
  lg: 'h-12 w-24 flex-col gap-1 text-xs font-bold',
};
```

And update the container gap (line 71):
```typescript
<div className={cn("flex", size === "lg" ? "gap-2" : "gap-1")} role="group" aria-label="Availability">
```

Also increase the label text size from `text-[9px]` to `text-[10px]`:
```typescript
{size === 'lg' && (
  <span className="text-[10px] uppercase tracking-wider leading-none">{label}</span>
)}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/availability-widget.tsx
git commit -m "ux: fix cramped availability widget — wider buttons, better spacing"
```

---

### Task 17: Auto-populate readings when editing a service

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/page.tsx` (pass readings + lectionary to ServicePlanner)
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/service-planner.tsx` (accept and use readings)

**Context:** When a user clicks "Edit Service", readings should auto-populate. Business rules:
- Sunday morning (SUNG_EUCHARIST, SAID_EUCHARIST, FAMILY_SERVICE) → Principal Service lectionary
- Evensong (CHORAL_EVENSONG) → Second Service lectionary

- [ ] **Step 1: Pass readings data to ServicePlanner**

In `page.tsx`, the `dayReadings` are already fetched (line 61-64). Pass them to `ServicePlanner`:

```typescript
<ServicePlanner
  churchId={churchId}
  liturgicalDayId={day.id}
  date={date}
  existingServices={dayServices as Parameters<typeof ServicePlanner>[0]['existingServices']}
  editorSectionsMap={editorSectionsMap}
  editorSlotsMap={editorSlotsMap}
  readings={dayReadings}
/>
```

- [ ] **Step 2: Update ServicePlanner to accept and use readings**

In `service-planner.tsx`, add `readings` to the props interface and implement the lectionary selection logic:

```typescript
interface ServicePlannerProps {
  // ... existing props ...
  readings?: Array<{
    lectionary: string;
    position: string;
    reference: string;
    readingText?: string | null;
    bibleVersion?: string | null;
  }>;
}
```

Add a helper function to select the correct lectionary based on service type:

```typescript
function getLectionaryForServiceType(serviceType: string): string {
  switch (serviceType) {
    case "CHORAL_EVENSONG":
      return "SECOND";
    case "SUNG_EUCHARIST":
    case "SAID_EUCHARIST":
    case "FAMILY_SERVICE":
    case "CHORAL_MATINS":
    default:
      return "PRINCIPAL";
  }
}
```

Filter the readings when displaying them, and make them available to the auto-generation flow.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/services/[date]/page.tsx src/app/(app)/churches/[churchId]/services/[date]/service-planner.tsx
git commit -m "feat: auto-populate readings in service editor with correct lectionary"
```

---

### Task 18: Design system refinement — border radius, spacing, shadows

**Files:**
- Modify: `src/app/globals.css`

**Context:** Soften border radius from 2px to 4-6px. Refine shadow hierarchy. This is a small, low-risk change that modernises the feel.

- [ ] **Step 1: Update design tokens**

In `globals.css`, update the `@theme inline` block:

```css
/* Border radius — soften from 2px to 4px */
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 6px;
--radius-xl: 8px;
--radius-2xl: 10px;

/* Shadows — refine hierarchy */
--shadow-sm: 0 1px 2px rgba(44, 36, 22, 0.05);
--shadow: 0 1px 3px rgba(44, 36, 22, 0.07), 0 1px 2px rgba(44, 36, 22, 0.04);
--shadow-md: 0 4px 6px -1px rgba(44, 36, 22, 0.07), 0 2px 4px -2px rgba(44, 36, 22, 0.05);
--shadow-lg: 0 10px 15px -3px rgba(44, 36, 22, 0.07), 0 4px 6px -4px rgba(44, 36, 22, 0.05);
```

And in `:root`:
```css
--radius: 4px;
```

- [ ] **Step 2: Visual check — start dev server and verify**

Run: `npm run dev`
Check: Landing page, dashboard, service editor, rota page all render with softened corners and refined shadows. No broken layouts.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "design: soften border radius to 4px, refine shadow hierarchy"
```

---

### Task 19: Consistent Button and form input patterns

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/members/invite-form.tsx` (replace custom buttons with Button)
- Modify: `src/app/(app)/churches/[churchId]/settings/settings-form.tsx` (replace custom buttons with Button)

- [ ] **Step 1: Replace custom buttons in invite-form.tsx**

Replace the custom-styled `<button>` elements (lines 82-98) with the `<Button>` component:

```typescript
import { Button } from "@/components/ui/button";

// Replace "Send Email" button:
<Button
  onClick={() => handleInvite(true)}
  disabled={loading || !email}
  size="sm"
>
  {loading && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
  Send Email
</Button>

// Replace "Get Link" button:
<Button
  variant="outline"
  onClick={() => handleInvite(false)}
  disabled={loading || !email}
  size="sm"
>
  Get Link
</Button>
```

- [ ] **Step 2: Do the same for settings-form.tsx**

Replace any custom-styled buttons with the `Button` component for consistency.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/members/invite-form.tsx src/app/(app)/churches/[churchId]/settings/settings-form.tsx
git commit -m "ux: replace custom button styles with consistent Button component"
```

---

### Task 20: Improve toast notifications for errors

**Files:**
- Modify: `src/components/ui/toast.tsx`

- [ ] **Step 1: Make error toasts persistent (no auto-dismiss)**

In the toast component, modify the auto-dismiss logic so that error-type toasts stay visible until manually dismissed. Find the auto-dismiss timeout (around line 50) and add a guard:

```typescript
// Only auto-dismiss non-error toasts
if (type !== "error") {
  timeoutId = setTimeout(() => removeToast(id), 4000);
}
```

Ensure there's a dismiss/close button on every toast so error toasts can be manually closed.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/toast.tsx
git commit -m "ux: make error toasts persistent until dismissed"
```

---

### Task 21: Add field-level validation to auth forms

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add inline validation to login form**

Add client-side validation with error messages:
- Email field: Show "Please enter a valid email" on blur if empty or invalid format
- Password field: Show "Password is required" on blur if empty

Use a simple state object for field errors:
```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
```

Add `onBlur` handlers to inputs that validate and update `fieldErrors`. Display errors below each field in `<p className="text-xs text-destructive mt-1">`.

- [ ] **Step 2: Apply same pattern to signup form**

Same approach, with additional validation:
- Name: "Name is required"
- Email: "Please enter a valid email"
- Password: "Password must be at least 8 characters"

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/page.tsx
git commit -m "ux: add field-level validation to login and signup forms"
```

---

### Task 22: Responsive fixes — email text size, members table

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/members/members-table.tsx`

- [ ] **Step 1: Increase mobile email text size**

Find the mobile email display (using `text-xs`). Change to `text-sm`:

```typescript
<div className="font-mono text-sm text-muted-foreground sm:hidden">{m.userEmail}</div>
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/churches/[churchId]/members/members-table.tsx
git commit -m "ux: increase mobile email text size for readability"
```

---

### Task 23: Add loading skeletons with proper shapes

**Files:**
- Modify: `src/app/(app)/loading.tsx`
- Modify: `src/app/(app)/dashboard/loading.tsx`

- [ ] **Step 1: Update app loading skeleton**

Already updated in Task 14 with `aria-busy`. Now ensure the skeleton shapes match the actual content structure (heading + cards):

```typescript
export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-pulse" role="status" aria-busy="true" aria-label="Loading">
      <span className="sr-only">Loading...</span>
      <div className="h-8 w-48 bg-muted rounded-md mb-6" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-md" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard loading skeleton**

Ensure it matches the dashboard layout (heading + grid of cards):

```typescript
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-pulse" role="status" aria-busy="true" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard...</span>
      <div className="h-8 w-56 bg-muted rounded-md mb-6" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-md" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/loading.tsx src/app/(app)/dashboard/loading.tsx
git commit -m "ux: improve loading skeletons with content-shaped placeholders"
```

---

## Final Verification

### Task 24: Full test suite and typecheck

- [ ] **Step 1: Run full lint + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: PASS with no errors

- [ ] **Step 2: Run unit tests**

Run: `npm run test`
Expected: All pass

- [ ] **Step 3: Run E2E tests**

Run: `npm run test:e2e`
Expected: All pass (non-auth tests; auth tests skipped in CI)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: Builds successfully with no errors

- [ ] **Step 5: Manual smoke test**

Start dev server and verify:
- Service editor: no "Error saving Mass Setting", readings auto-populate
- Availability widget: text not cramped
- Rota grid: buttons are larger/easier to tap
- Forms: focus rings visible, field-level errors work
- Loading states: skeletons show, not blank pages
- Corners: softened from 2px to 4px
- Error toasts: stay visible until dismissed
- No console errors in browser

---

## Notes for Phase B continuation

The following Phase B items from the spec are intentionally deferred to a separate plan because they require visual brainstorming with the frontend-design skill:

- **B1.1 Quick entry fields at top of editor** — needs UI design for mass setting/communion/psalm chant pickers
- **B1.3 Reduce clicks and cognitive load** — requires UX audit of the full editor flow
- **B2.2 Simplify member view** — needs new focused member dashboard design
- **B3.2 Consistent component patterns** — full button/input audit across all pages
- **B5.1 Review page flow** — needs navigation audit
- **B6.1 Landing page polish** — needs design review

These should be brainstormed and designed separately using the frontend-design skill, then planned and implemented in a follow-up.
