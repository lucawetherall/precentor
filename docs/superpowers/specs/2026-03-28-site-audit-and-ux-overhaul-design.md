# Site Audit & UX Overhaul — Design Spec

**Date:** 2026-03-28
**Approach:** Fix First, Polish Second (Sequential)
**Target:** Soft launch to 5-10 parishes
**Design direction:** Keep ecclesiastical character, modernise elements — professional, accessible, simple

---

## Overview

Two-phase overhaul of Precentor ahead of soft launch:

- **Phase A — Stability & Performance:** Fix all identified bugs, performance issues, and code quality problems across the entire codebase.
- **Phase B — UX & Design Polish:** Comprehensive UX pass using frontend-design to modernise the interface while retaining the ecclesiastical identity.

---

## Phase A: Stability & Performance

### A1. Critical Bugs & Data Integrity

**A1.1 Fix "Error saving Mass Setting"**
- File: `use-service-editor.ts:400-413`
- Root cause: `debouncedUpdateSettings` performs optimistic dispatch without taking a snapshot first. When the server call fails 500ms later, rollback has no previous state to restore.
- Fix: Capture snapshot from `stateRef.current` before dispatching `SET_SETTINGS`. Pass that snapshot to `runMutation` in the debounce callback.

**A1.2 Fix verse selector stuck in "saving" state**
- File: `verse-selector.tsx:100`
- Root cause: If the GET request fails, the function returns early but `setSaving` remains true.
- Fix: Wrap in try/finally to ensure `setSaving(false)` always runs. Show error toast on failure.

**A1.3 Fix debounce timer leak on unmount**
- File: `use-service-editor.ts:234`
- Root cause: `debounceRef` timeout not cleared when component unmounts.
- Fix: Add cleanup effect that clears the timeout on unmount.

**A1.4 Fix race condition in add section**
- File: `use-service-editor.ts:339-380`
- Root cause: If user edits a section with a temp ID before the server responds, the ID replacement can fail silently.
- Fix: Guard replacement — verify the temp ID still exists in state before swapping. If not found, refetch sections from server.

**A1.5 Fix VerseStepper fire-and-forget**
- File: `verse-stepper.tsx:39-51`
- Root cause: Click handlers don't await `handleUpdate`, so rapid clicks cause UI/server divergence.
- Fix: Await the promise, disable +/- buttons while saving, handle errors with rollback.

**A1.6 Replace silent catch blocks**
- Files: `mass-setting-control.tsx:60-62`, `verse-selector.tsx:70-71`, `hymn-picker.tsx`
- Root cause: Errors swallowed with empty `catch {}`.
- Fix: Surface errors via toast notifications. Log to `logger.error()` for debugging.

### A2. Performance — Database & Queries

**A2.1 Fix N+1 queries on service page**
- File: `services/[date]/page.tsx:124-140`
- Root cause: Loop issues 2 queries per service (sections + slots).
- Fix: Batch using `inArray()` — one query for all sections, one for all slots. Group results by serviceId in JS.

**A2.2 Fix N+1 in PDF generation**
- File: `build-sheet-data.ts:176-191`
- Root cause: 3 redundant `.find()` calls per section + hymn verse query inside loop.
- Fix: Pre-build a Map keyed by slot ID before the loop. Batch-fetch all hymn verses in one query upfront.

**A2.3 Add missing database indexes**
- `performanceLogs` — index on `churchId`
- `availability` — index on `serviceId`
- `rotaEntries` — index on `serviceId`
- Create a Drizzle migration for all three.

**A2.4 Replace O(n) lookups with Maps**
- File: `services/page.tsx:89-94`
- Root cause: `.find()` and `.filter()` inside loops over liturgical days.
- Fix: Build `Map<string, Service>` and `Map<string, Slot[]>` before the loop.

**A2.5 Add Suspense boundaries**
- Add `<Suspense>` with skeleton fallbacks to:
  - Service editor page (wrap data-dependent sections)
  - Services list page (wrap calendar + list)
  - Dashboard (wrap church cards)

**A2.6 Add memoization to large client components**
- `service-planner.tsx` — memoize section row callbacks, wrap child components in `React.memo`
- `rota-grid.tsx` — memoize row components, stabilize callback references with `useCallback`

**A2.7 Remove redundant hymn fetch**
- File: `hymn-picker.tsx:55-74`
- Skip the useEffect fetch when the hymn data is already available from the search result.

### A3. Code Quality & Architecture

**A3.1 Add Zod validation to API routes**
- Replace manual `typeof` checks across 24+ API routes with Zod schemas.
- Create shared schemas in `src/lib/validation/` for reuse (e.g., `serviceUpdateSchema`, `sectionCreateSchema`, `memberInviteSchema`).
- Validate request bodies at the top of each route handler.

**A3.2 Extract permission middleware**
- Replace the 24x duplicated `requireChurchRole` + `if (error) return error` pattern.
- Create a `withChurchAuth(role, handler)` wrapper that handles auth check and returns the handler with `churchId` and `userId` pre-validated.

**A3.3 Split large files**
- `use-service-editor.ts` (484 lines) — extract mutation functions into `use-service-mutations.ts`, keep reducer and state in the hook.
- `build-sheet-data.ts` (425 lines) — extract section resolvers into `resolve-sections.ts`, keep main orchestration.
- `service-planner.tsx` (423 lines) — extract service header, section list, and action bar into sub-components.
- `booklet-preview.tsx` (443 lines) — extract page renderers into sub-components.

**A3.4 Fix email validation**
- File: `members/route.ts:9`
- Replace weak regex with Zod email validator (comes free with A3.1).

**A3.5 Remove deprecated PUT endpoint**
- File: `sections/route.ts:110-113`
- Remove the deprecated PUT handler. Verify no client code still calls it.

**A3.6 Standardise error handling**
- Create `apiError(message, status)` helper to replace the repeated `NextResponse.json({ error }, { status })` pattern.
- Ensure all routes use consistent error response shape: `{ error: string, details?: string }`.

### A4. Accessibility Fixes

**A4.1 Fix color contrast**
- `--muted-foreground: #6B5E4F` on `#FAF6F1` — test with contrast checker. If below 4.5:1, darken to meet WCAG AA.

**A4.2 Add focus-visible rings**
- Files: `invite-form.tsx`, `members-table.tsx`, `choir-status-badge.tsx`
- Replace `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-primary` consistently.

**A4.3 Add aria-busy/aria-live to loading states**
- Add `aria-busy="true"` and wrap in `aria-live="polite"` region for loading skeletons in `loading.tsx` files.

**A4.4 Enlarge touch targets**
- Rota grid buttons: increase from `w-6 h-6` (24px) to minimum `w-10 h-10` (40px) with adequate padding.
- Drag handles in section-row: increase padding for easier targeting.

**A4.5 Fix section overflow**
- File: `section-row.tsx:286`
- Change `overflow-hidden` to `overflow-y-auto` so long content scrolls instead of being silently clipped.

---

## Phase B: UX & Design Polish

### B1. Service Editor Overhaul

**B1.1 Quick entry fields at top of editor**
- Add prominent fields at the top of the editor view for:
  - Default mass setting (dropdown/combobox)
  - Communion music (text input or picker)
  - Psalm chant (text input or picker)
- These are the three things set on almost every service. They should be 1-click, not buried in sections.

**B1.2 Auto-populate readings on "Edit Service"**
- When a user clicks "Edit Service", pre-fill the readings from the lectionary data.
- Apply business rules:
  - Sunday morning services → Principal Service lectionary
  - Evensong → Second Service lectionary
- Match the data already shown in the tabbed readings boxes on the services list page.

**B1.3 Reduce clicks and cognitive load**
- Audit every action in the editor for unnecessary steps.
- Default-fill where possible (e.g., if a church always uses the same mass setting, pre-select it).
- Collapse rarely-used options, surface frequent ones.
- Add clear save status indicator (saved/saving/error) that doesn't rely on toast timing.

### B2. Rota & Availability

**B2.1 Fix cramped availability widget**
- Increase button width from `w-20` to `w-24` or wider.
- Increase gap from `gap-0.5` to `gap-1.5`.
- Consider abbreviating labels on small screens: "Avail" / "Unavail" / "Maybe".

**B2.2 Simplify member view**
- Members need two things: mark availability and see what's coming up.
- Design a focused member dashboard that shows:
  - Upcoming services (next 2-4 weeks) with one-tap availability buttons
  - Basic service info (date, time, type) without editor complexity
- Strip all admin/editor UI from member view.

### B3. Visual Modernisation

**B3.1 Design system refinement**
- Keep: Cormorant Garamond headings, Libre Baskerville body, cream/brown palette, liturgical colors
- Modernise:
  - Soften border radius from 2px to 4-6px
  - Tighten spacing system — audit for inconsistent padding/margins
  - Improve shadow hierarchy for better depth perception
  - Refine card styles for cleaner edges
  - Review typography scale for better hierarchy (heading sizes, line heights)

**B3.2 Consistent component patterns**
- Audit all buttons — replace custom-styled buttons with the `Button` component
- Standardise form inputs (consistent focus states, heights, label styles)
- Consistent empty states across all pages (icon + message + action pattern)
- Consistent loading skeletons that match actual content layout

**B3.3 Responsive refinement**
- Fix members table email text size (increase from `text-xs` to `text-sm` on mobile)
- Ensure all interactive elements meet minimum touch target sizes
- Test all pages at mobile, tablet, desktop breakpoints
- Fix any overflow or cramped layouts

### B4. Form Validation & Feedback

**B4.1 Add field-level validation**
- Login, signup, forgot-password forms — show inline errors per field
- Settings form — validate on blur, show success/error per field
- Invite form — validate email format before submission

**B4.2 Improve toast notifications**
- Increase duration for error toasts (don't auto-dismiss errors)
- Add action buttons to error toasts where recovery is possible (e.g., "Retry")

### B5. Navigation & Information Architecture

**B5.1 Review page flow**
- Ensure no dead ends — every page has clear next actions
- Dashboard quick actions should cover the most common tasks
- Breadcrumbs or clear "back" navigation on deep pages

**B5.2 Loading experience**
- Replace blank loading states with content-shaped skeletons
- Ensure perceived performance feels fast even when data is loading

### B6. Landing Page Polish

**B6.1 First impressions for soft launch**
- Review landing page copy, hero, feature sections, CTA
- Ensure it clearly communicates what Precentor does for a Church of England parish
- Professional appearance that builds trust for early adopters

---

## Success Criteria

- All 26 identified bugs fixed with no regressions
- Service editor workflow reduced to fewer clicks for standard Sunday service setup
- Readings auto-populate with correct lectionary defaults
- Mass setting, communion music, psalm chant editable from top of editor
- Availability widget readable and usable on all screen sizes
- All WCAG AA contrast requirements met
- All interactive elements have visible focus indicators
- Touch targets meet 40px minimum
- No N+1 query patterns remaining
- All API routes validated with Zod
- Site feels fast — no visible loading delays on standard operations
- Consistent visual language across all pages
- Clean, maintainable codebase ready for feature growth

---

## Out of Scope

- Load testing / horizontal scaling (not needed for 5-10 parishes)
- New features beyond what's listed (e.g., no new pages or major functionality)
- Onboarding documentation (separate effort)
- Mobile app / PWA
- Migration to different hosting or database
