# Full Site Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically review, test, and improve every page and API route in the Precentor site using Claude Code plugins, producing an audit report with findings by severity.

**Architecture:** Page-by-page sequential review using Claude Preview as primary tool (screenshots, snapshots, CSS inspection, network/console monitoring), with Playwright MCP for interaction testing and source code review for static analysis. Quick wins fixed inline; medium/major issues logged.

**Tech Stack:** Claude Preview MCP, Playwright MCP, axe-core (CDN), Next.js 16.2.0, Vitest, Playwright E2E

**Spec:** `docs/superpowers/specs/2026-03-22-site-review-design.md`

**Dev server:** Next.js dev already running — server name `next-dev`, port 3000. If restarting needed: `preview_start` with name `next-dev` from `.claude/launch.json`.

---

## Standard Page Review Protocol

Every page review task follows this protocol. Each task specifies: **URL**, **source file**, **elements to inspect**, and **interactions to test**. The protocol steps are:

1. **Navigate + desktop screenshot** — For public pages (Phase 1), use `preview_eval` with `window.location.href = '<URL>'`. For authenticated pages (Phases 2–4), prefer `preview_click` on navigation links where available to preserve auth cookies; only use `window.location.href` as a fallback if no link is available. Then `preview_screenshot`. Check layout, alignment, whitespace, typography, colour.
2. **Mobile screenshot** — `preview_resize` to mobile (375×812), `preview_screenshot`. Check overflow, truncation, touch targets, stacking.
3. **Tablet screenshot** — `preview_resize` to tablet (768×1024), `preview_screenshot`. Check intermediate breakpoint behaviour.
4. **Restore desktop** — `preview_resize` to desktop (1280×800).
5. **Accessibility snapshot** — `preview_snapshot`. Check heading hierarchy, ARIA roles, semantic structure.
6. **axe-core audit** — `preview_eval` with:
   ```js
   (async () => {
     if (!window.axe) {
       const s = document.createElement('script');
       s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js';
       document.head.appendChild(s);
       await new Promise(r => s.onload = r);
     }
     const results = await axe.run();
     return JSON.stringify(results.violations.map(v => ({
       id: v.id, impact: v.impact, description: v.description,
       nodes: v.nodes.length
     })), null, 2);
   })()
   ```
   Check: colour contrast, form labels, alt text, focus management.
7. **Console errors** — `preview_console_logs` with level `error`. Check: no JS errors, no hydration warnings, no unhandled promises.
8. **Network failures** — `preview_network` with filter `failed`. Check: no 404s, no failed API calls, no CORS errors.
9. **Performance baseline** — `preview_network` (all) to note request count + total weight. `preview_eval` with `JSON.stringify(performance.getEntriesByType('navigation')[0])` for load timing. Flag outliers only.
10. **CSS inspection** — `preview_inspect` on page-specific elements (listed per task). Check: Tailwind tokens used consistently, no hardcoded colours/spacing.
11. **Interaction testing** — Use `preview_click`/`preview_fill` or Playwright MCP for page-specific interactions (listed per task). Check: validation, error states, success states, routing.
12. **Source code review** — Read the page's source file(s) AND wrapping layout(s). Before any fix, consult `node_modules/next/dist/docs/`. Check: auth guards, error boundaries, loading states, TypeScript strictness, XSS/injection, edge cases.
13. **Log findings** — Append to `docs/superpowers/specs/site-audit-report.md` using the per-page format from the spec.
14. **Fix quick wins** — Fix trivial issues (typos, missing alt text, CSS bugs). Re-screenshot to verify fix. Commit with descriptive message.

**Session timeout note:** If any authenticated page unexpectedly redirects to `/login` during Phases 2–4, re-authenticate using the credentials from Task 8 before continuing.

**Playwright MCP fallback:** If Preview's `preview_click`/`preview_fill` cannot handle a complex interaction (multi-step dialogs, file uploads), use Playwright MCP tools instead. These use `mcp__plugin_playwright_playwright__browser_*` tool names and operate in a separate browser context — navigate to the page URL first via `browser_navigate`.

---

## Task 0: Setup — Create Audit Report File

**Files:**
- Create: `docs/superpowers/specs/site-audit-report.md`

- [ ] **Step 1: Verify launch.json exists**

Check that `.claude/launch.json` exists with the `next-dev` configuration. If missing, create it:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "next-dev",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```

- [ ] **Step 2: Create audit report with header**

```markdown
# Precentor Site Audit Report

**Date:** 2026-03-22
**Status:** In Progress
**Branch:** claude/awesome-colden

## Summary
- Pages reviewed: 0/20
- Cross-cutting reviews: 0/6
- Quick wins fixed: 0
- Medium issues: 0
- Major issues: 0

---

## Per-Page Findings
```

- [ ] **Step 3: Verify dev server is running**

Run: `preview_screenshot` with serverId for `next-dev`
Expected: Landing page renders without errors

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/site-audit-report.md
git commit -m "Add empty site audit report scaffold"
```

---

## Task 1: Review `/` (Landing Page)

**URL:** `http://localhost:3000/`
**Source:** `src/app/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** `h1` (title), `.btn` or `a[href="/signup"]` (CTA), `a[href="/login"]` (sign in link), feature cards/sections
**Interactions:** Click "Get Started Free" → should navigate to `/signup`. Click "Sign In" → should navigate to `/login`.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4 (visual + responsive screenshots)
- [ ] **Step 2:** Follow Protocol steps 5–6 (accessibility snapshot + axe-core)
- [ ] **Step 3:** Follow Protocol steps 7–9 (console, network, performance)
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `h1`, primary CTA button, secondary link, any feature cards
- [ ] **Step 5:** Follow Protocol step 11 — click "Get Started Free" → verify navigation to `/signup`. Navigate back. Click "Sign In" → verify navigation to `/login`. Navigate back.
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/page.tsx` and `src/app/layout.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14 (log findings, fix quick wins, commit)

---

## Task 2: Review `/login` (Login Form)

**URL:** `http://localhost:3000/login`
**Source:** `src/app/(auth)/login/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** `form`, `input[type="email"]`, `input[type="password"]`, submit button, "Forgot password?" link, "Sign up" link
**Interactions:** Submit empty form → should show validation errors. Click "Forgot password?" → should navigate to `/forgot-password`. Click "Sign up" → should navigate to `/signup`.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4 (visual + responsive)
- [ ] **Step 2:** Follow Protocol steps 5–6 (accessibility + axe-core)
- [ ] **Step 3:** Follow Protocol steps 7–9 (console, network, performance)
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `form`, email input, password input, submit button
- [ ] **Step 5:** Follow Protocol step 11 — submit empty form, check validation. Click "Forgot password?" link. Click "Sign up" link.
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(auth)/login/page.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14 (log, fix, commit)

---

## Task 3: Review `/signup` (Registration Form)

**URL:** `http://localhost:3000/signup`
**Source:** `src/app/(auth)/signup/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** `form`, name input, email input, password input, submit button, "Sign in" link
**Interactions:** Submit empty form → validation errors. Click "Sign in" → navigate to `/login`.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `form`, all inputs, submit button
- [ ] **Step 5:** Follow Protocol step 11 — submit empty form, check validation. Test password requirements if any. Click "Sign in" link.
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(auth)/signup/page.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 4: Review `/forgot-password` (Password Reset Request)

**URL:** `http://localhost:3000/forgot-password`
**Source:** `src/app/(auth)/forgot-password/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** `form`, email input, submit button, "Back to login" link
**Interactions:** Submit empty form → validation. Click "Back to login" → navigate to `/login`.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `form`, email input, submit button
- [ ] **Step 5:** Follow Protocol step 11 — submit empty form, check validation. Click back-to-login link.
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(auth)/forgot-password/page.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 5: Review `/reset-password` (Password Reset Form)

**URL:** `http://localhost:3000/reset-password`
**Source:** `src/app/(auth)/reset-password/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** `form`, password input(s), submit button
**Interactions:** Submit empty form → validation. Check password confirmation match if present.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `form`, password input(s), submit button
- [ ] **Step 5:** Follow Protocol step 11 — submit empty form, check validation. Note: page may require a valid reset token in URL to render the form.
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(auth)/reset-password/page.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 6: Review `/invite/[token]` (Invite Acceptance)

**URL:** `http://localhost:3000/invite/test-invalid-token`
**Source:** `src/app/(auth)/invite/[token]/page.tsx`
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** Error/status message, any form elements, links
**Interactions:** Page should handle invalid token gracefully (error message, not a crash). Check for loading states.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect any visible UI elements
- [ ] **Step 5:** Follow Protocol step 11 — verify invalid token shows a user-friendly error, not an unhandled exception
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(auth)/invite/[token]/page.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 7: Review `/non-existent-route` (404 Behaviour)

**URL:** `http://localhost:3000/this-page-does-not-exist`
**Source:** No page file — check for `not-found.tsx` (currently none exists)
**Layouts:** `src/app/layout.tsx` (root)
**Elements to inspect:** Whatever 404 UI renders (Next.js default or custom)
**Interactions:** None — just verify the error UX is acceptable.

- [ ] **Step 1:** Navigate to `http://localhost:3000/this-page-does-not-exist`. Desktop screenshot.
- [ ] **Step 2:** Mobile + tablet screenshots.
- [ ] **Step 3:** Accessibility snapshot — check the error page is accessible.
- [ ] **Step 4:** Console errors + network failures — should be clean (404 on the page itself is expected).
- [ ] **Step 5:** Log finding: is the 404 experience acceptable? If it's the raw Next.js default, log as MEDIUM (should have a custom `not-found.tsx`).
- [ ] **Step 6:** Follow Protocol steps 13–14

---

## Task 8: Phase 1 Wrap-Up + Auth Transition

- [ ] **Step 1: Update audit report summary**

Update the Summary section counts in `docs/superpowers/specs/site-audit-report.md`.

- [ ] **Step 2: Commit audit report**

```bash
git add docs/superpowers/specs/site-audit-report.md
git commit -m "Complete Phase 1 audit: public pages"
```

- [ ] **Step 3: Request credentials from user**

Ask the user for test account credentials (email + password) for Supabase auth. The account should have at least one church with members, services, and music data.

- [ ] **Step 4: Log in via Preview**

Navigate to `/login`. Use `preview_fill` to enter email + password. Use `preview_click` on submit button. Verify redirect to `/dashboard`. If login fails, fall back to Phase 5 tasks (Tasks 22–27) and return here when credentials work.

---

## Task 9: Review `/onboarding` (Post-Signup Setup)

**URL:** `http://localhost:3000/onboarding`
**Source:** `src/app/(app)/onboarding/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
**Elements to inspect:** Wizard steps/form, inputs, submit button, progress indicator
**Interactions:** Test form validation. Note: may redirect if user already has a church — log this behaviour.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect wizard UI elements
- [ ] **Step 5:** Follow Protocol step 11 — test form validation, step progression
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(app)/onboarding/page.tsx` AND `src/app/(app)/layout.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 10: Review `/dashboard` (Main Dashboard)

**URL:** `http://localhost:3000/dashboard`
**Source:** `src/app/(app)/dashboard/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
**Loading:** `src/app/(app)/dashboard/loading.tsx`
**Elements to inspect:** Sidebar navigation, church cards/list, any summary stats, heading hierarchy
**Interactions:** Click on a church card → should navigate to church sub-pages. Test sidebar links.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: sidebar nav, church cards, headings, any stat elements
- [ ] **Step 5:** Follow Protocol step 11 — click church card, test sidebar navigation links
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/dashboard/loading.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 11: Review `/dashboard/lectionary` (Lectionary Sync & Calendar)

**URL:** `http://localhost:3000/dashboard/lectionary`
**Source:** `src/app/(app)/dashboard/lectionary/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
**Loading:** `src/app/(app)/dashboard/lectionary/loading.tsx`
**Elements to inspect:** Calendar view, sync button/form, lectionary day cards, readings display
**Interactions:** Test sync form if present. Navigate between calendar dates.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: calendar, sync controls, reading cards
- [ ] **Step 5:** Follow Protocol step 11 — test sync interaction, calendar navigation
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(app)/dashboard/lectionary/page.tsx`, `src/app/(app)/dashboard/lectionary/loading.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 12: Review `/churches` (Church List)

**URL:** `http://localhost:3000/churches`
**Source:** `src/app/(app)/churches/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
**Loading:** `src/app/(app)/churches/loading.tsx`
**Elements to inspect:** Church list/cards, "New church" button/link, sidebar
**Interactions:** Click a church → navigate to its sub-pages. Click "New church" → `/churches/new`.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: church cards, new church button
- [ ] **Step 5:** Follow Protocol step 11 — click church card, click new church button
- [ ] **Step 6:** Follow Protocol step 12 — read `src/app/(app)/churches/page.tsx` and `src/app/(app)/churches/loading.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 13: Review `/churches/new` (Create New Church)

**URL:** `http://localhost:3000/churches/new`
**Source:** `src/app/(app)/churches/new/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
**Elements to inspect:** Church creation form, all input fields, submit button
**Interactions:** Submit empty form → validation. Do NOT submit a valid form (would create data).

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: `form`, all inputs, submit button
- [ ] **Step 5:** Follow Protocol step 11 — submit empty form, check validation messages
- [ ] **Step 6:** Follow Protocol step 12 — read source file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 14: Review `/churches/[churchId]/sundays` (Service Calendar)

**URL:** `http://localhost:3000/churches/<churchId>/sundays` (use actual churchId from dashboard)
**Source:** `src/app/(app)/churches/[churchId]/sundays/page.tsx`
**Layouts:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/churches/[churchId]/layout.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/sundays/loading.tsx`
**Elements to inspect:** Calendar/list of Sundays, service cards, church sidebar navigation
**Interactions:** Click a Sunday → navigate to service editor. Test church sidebar nav links.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: calendar/list, service cards, church sidebar
- [ ] **Step 5:** Follow Protocol step 11 — click a Sunday to navigate to service editor. Test all church sidebar links.
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading + `src/app/(app)/churches/[churchId]/layout.tsx`
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 15: Review `/churches/[churchId]/sundays/[date]` (Service Editor)

**URL:** `http://localhost:3000/churches/<churchId>/sundays/<date>` (use actual values)
**Source:** `src/app/(app)/churches/[churchId]/sundays/[date]/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/sundays/[date]/loading.tsx`
**Elements to inspect:** Service planner, music slot editors, service settings, readings display, hymn/anthem search
**Interactions:** Test music slot editor (add/edit/remove). Test hymn search. Test settings changes. Do NOT save changes that would corrupt test data unless safe.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: planner layout, music slot components, search UI
- [ ] **Step 5:** Follow Protocol step 11 — test music slot interactions carefully. Open hymn search. Test inline editing if present.
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 16: Review `/churches/[churchId]/members` (Member Management)

**URL:** `http://localhost:3000/churches/<churchId>/members`
**Source:** `src/app/(app)/churches/[churchId]/members/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/members/loading.tsx`
**Elements to inspect:** Members table, invite form, role badges, voice part labels
**Interactions:** Test invite form validation (submit empty). Do NOT send real invites.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: table, invite form, badges
- [ ] **Step 5:** Follow Protocol step 11 — submit empty invite form, check validation
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 17: Review `/churches/[churchId]/repertoire` (Performance History)

**URL:** `http://localhost:3000/churches/<churchId>/repertoire`
**Source:** `src/app/(app)/churches/[churchId]/repertoire/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/repertoire/loading.tsx`
**Elements to inspect:** Repertoire list/table, date/piece columns, any filters
**Interactions:** Test any sorting/filtering. Test pagination if present.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: list/table, column headers
- [ ] **Step 5:** Follow Protocol step 11 — test any sorting, filtering, or pagination
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 18: Review `/churches/[churchId]/rota` (Choir Rota)

**URL:** `http://localhost:3000/churches/<churchId>/rota`
**Source:** `src/app/(app)/churches/[churchId]/rota/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/rota/loading.tsx`
**Elements to inspect:** Rota grid/calendar, singer assignments, availability indicators
**Interactions:** Test availability toggling if present. Test rota assignment interactions.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: grid layout, assignment cells, availability indicators
- [ ] **Step 5:** Follow Protocol step 11 — test grid interactions carefully (avoid corrupting data)
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 19: Review `/churches/[churchId]/service-sheets` (Service Sheet Generation)

**URL:** `http://localhost:3000/churches/<churchId>/service-sheets`
**Source:** `src/app/(app)/churches/[churchId]/service-sheets/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/service-sheets/loading.tsx`
**Elements to inspect:** Sheet list, generate/download buttons, format options (PDF/Word)
**Interactions:** Test generate button (should trigger API call). Check download links work.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: sheet list, buttons, format selectors
- [ ] **Step 5:** Follow Protocol step 11 — test generate interaction, check network for API call
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 20: Review `/churches/[churchId]/settings` (Church Settings)

**URL:** `http://localhost:3000/churches/<churchId>/settings`
**Source:** `src/app/(app)/churches/[churchId]/settings/page.tsx`
**Loading:** `src/app/(app)/churches/[churchId]/settings/loading.tsx`
**Elements to inspect:** Settings form, all input fields, save button
**Interactions:** Test form validation. Do NOT submit changes to avoid data corruption.

- [ ] **Step 1:** Follow Standard Page Review Protocol steps 1–4
- [ ] **Step 2:** Follow Protocol steps 5–6
- [ ] **Step 3:** Follow Protocol steps 7–9
- [ ] **Step 4:** Follow Protocol step 10 — inspect: form, all inputs, save button
- [ ] **Step 5:** Follow Protocol step 11 — test validation only, do not save
- [ ] **Step 6:** Follow Protocol step 12 — read source + loading file
- [ ] **Step 7:** Follow Protocol steps 13–14

---

## Task 21: Phase 4 Wrap-Up

- [ ] **Step 1:** Update audit report summary counts
- [ ] **Step 2:** Commit audit report

```bash
git add docs/superpowers/specs/site-audit-report.md
git commit -m "Complete Phases 2-4 audit: authenticated pages"
```

---

## Task 22: Review Layout Files

**Files:**
- Read: `src/app/layout.tsx` (root layout)
- Read: `src/app/(app)/layout.tsx` (authenticated layout)
- Read: `src/app/(app)/churches/[churchId]/layout.tsx` (church layout)
- Read: `src/app/(app)/error.tsx` (error boundary)

- [ ] **Step 1: Read root layout**

Read `src/app/layout.tsx`. Check: meta tags, font loading, body structure, global providers, accessibility (lang attribute, viewport meta).

- [ ] **Step 2: Read authenticated layout**

Read `src/app/(app)/layout.tsx`. Check: auth guard implementation, sidebar rendering, redirect logic for unauthenticated users.

- [ ] **Step 3: Read church layout**

Read `src/app/(app)/churches/[churchId]/layout.tsx`. Check: churchId param validation, data fetching for sidebar, permission checks.

- [ ] **Step 4: Read error boundary**

Read `src/app/(app)/error.tsx`. Check: error display is user-friendly, has recovery action, does not leak sensitive info.

- [ ] **Step 5: Check for missing `(auth)` layout**

Verify whether auth pages (login, signup, forgot-password, reset-password, invite) share a consistent layout pattern. If they don't have a shared `(auth)/layout.tsx` and the visual review from Phase 1 showed inconsistent layouts across auth pages, log as MEDIUM finding.

- [ ] **Step 6: Log findings to audit report**

---

## Task 23: Review API Routes

**Files to review** (18 route handlers):

**Church CRUD:**
- `src/app/api/churches/route.ts` — POST/GET churches
- `src/app/api/churches/[churchId]/route.ts` — PATCH church

**Members:**
- `src/app/api/churches/[churchId]/members/route.ts` — POST/GET members
- `src/app/api/churches/[churchId]/members/[memberId]/route.ts` — member ops

**Services:**
- `src/app/api/churches/[churchId]/services/route.ts` — POST/GET services
- `src/app/api/churches/[churchId]/services/[serviceId]/route.ts` — service ops
- `src/app/api/churches/[churchId]/services/[serviceId]/slots/route.ts` — music slots
- `src/app/api/churches/[churchId]/services/[serviceId]/sheet/route.ts` — sheet gen

**Other:**
- `src/app/api/churches/[churchId]/sheets/route.ts` — sheets list
- `src/app/api/churches/[churchId]/rota/route.ts` — rota
- `src/app/api/churches/[churchId]/availability/route.ts` — availability
- `src/app/api/ai/suggest-music/route.ts` — AI suggestions
- `src/app/api/search/hymns/route.ts` — hymn search
- `src/app/api/search/anthems/route.ts` — anthem search
- `src/app/api/invites/[token]/route.ts` — invite validation
- `src/app/api/invites/[token]/accept/route.ts` — invite acceptance
- `src/app/api/cron/sync-lectionary/route.ts` — lectionary sync
- `src/app/api/cron/log-performances/route.ts` — performance logging

**API Review Checklist (per handler):**
1. Auth guard present? User permission verified?
2. Input validation with Zod? Sanitised?
3. Correct HTTP status codes? No data leaks in errors?
4. Database/external errors caught gracefully?
5. CSRF protection on state-changing routes?
6. Rate limiting on sensitive endpoints?

- [ ] **Step 1: Review church CRUD routes** — read `churches/route.ts` and `churches/[churchId]/route.ts`. Apply checklist.
- [ ] **Step 2: Review member routes** — read both member route files. Apply checklist.
- [ ] **Step 3: Review service routes** — read all 4 service route files. Apply checklist.
- [ ] **Step 4: Review rota, availability + sheets list routes** — read `rota/route.ts`, `availability/route.ts`, and `sheets/route.ts`. Apply checklist.
- [ ] **Step 5: Review search routes** — read `hymns/route.ts` and `anthems/route.ts`. Apply checklist.
- [ ] **Step 6: Review AI route** — read `ai/suggest-music/route.ts`. Apply checklist. Extra attention: prompt injection, token/cost limits.
- [ ] **Step 7: Review invite routes** — read both invite route files. Apply checklist. Extra attention: token validation, expiry checks.
- [ ] **Step 8: Review cron routes** — read both cron route files. Apply checklist. Extra attention: cron auth (should not be publicly callable).
- [ ] **Step 9: Log all API findings to audit report**
- [ ] **Step 10: Fix quick wins, commit**

---

## Task 24: Review Middleware & Auth

**Files:**
- Read: `src/proxy.ts`
- Read: `src/lib/supabase/middleware.ts`
- Read: `src/lib/supabase/server.ts`
- Read: `src/lib/supabase/client.ts`
- Read: `src/lib/auth/permissions.ts`

- [ ] **Step 1: Read proxy middleware** — `src/proxy.ts`. Check: route matching, redirect logic, auth token handling.
- [ ] **Step 2: Read Supabase middleware** — `src/lib/supabase/middleware.ts`. Check: session refresh, cookie handling, protected route enforcement.
- [ ] **Step 3: Read Supabase server/client** — `src/lib/supabase/server.ts` and `client.ts`. Check: correct SSR setup, no client-side secret leaks.
- [ ] **Step 4: Read permissions** — `src/lib/auth/permissions.ts`. Check: RBAC logic correctness, all roles handled, no privilege escalation paths.
- [ ] **Step 5: Log findings to audit report**

---

## Task 25: Review Shared Components

**Files:**
- Read: `src/components/church-sidebar.tsx`
- Read: `src/components/error-boundary.tsx`
- Read: `src/components/sign-out-button.tsx`
- Scan: `src/components/ui/` — spot-check 3-4 most-used components

- [ ] **Step 1: Read church sidebar** — check: active link highlighting, accessibility (nav landmark, aria-current), responsive collapse.
- [ ] **Step 2: Read error boundary** — check: catches errors gracefully, shows recovery UI, logs errors.
- [ ] **Step 3: Read sign-out button** — check: clears session properly, redirects to login.
- [ ] **Step 4: Spot-check UI components** — read `button.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`. Check: accessibility attributes, keyboard support, consistent prop patterns.
- [ ] **Step 5: Log findings to audit report**

---

## Task 26: Test Coverage Gap Analysis

**Existing tests:**
- Unit (15 files): `src/app/api/__tests__/`, `src/data/liturgy/__tests__/`, `src/lib/__tests__/`, `src/lib/auth/__tests__/`, `src/lib/lectionary/__tests__/`, `src/lib/pdf/__tests__/`, `src/types/__tests__/`
- E2E (4 files): `e2e/landing.spec.ts`, `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`, `e2e/accessibility.spec.ts`

- [ ] **Step 1: Run existing unit tests**

Run: `npm run test`
Expected: All tests pass. Log any failures as findings.

- [ ] **Step 2: Run existing E2E tests**

Run: `npm run test:e2e`
Expected: All tests pass (may need dev server). Log any failures.

- [ ] **Step 3: Run linter + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: No errors. Log any issues.

- [ ] **Step 4: Identify coverage gaps**

Compare existing test files against audit findings. Identify:
- API routes with no tests (most have none)
- Pages with no E2E coverage (most beyond landing/auth)
- Library code with no unit tests
- Interactions that broke during manual review

- [ ] **Step 5: Log gap analysis to audit report** — list specific files/flows that need tests, prioritised by risk.

---

## Task 27: Review CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

- [ ] **Step 1: Read CI config** — `/.github/workflows/ci.yml`. Check: job ordering, caching, env setup, artifact uploads.
- [ ] **Step 2: Compare against findings** — does CI catch the issues we found? Would lint/typecheck/tests have caught them?
- [ ] **Step 3: Log findings** — recommend CI improvements (e.g., add accessibility checks, add API route tests to CI).
- [ ] **Step 4: Update audit report with CI findings**

---

## Task 28: Final Report & Recommendations

- [ ] **Step 1: Update summary counts** — fill in final Pages reviewed, Quick wins fixed, Medium issues, Major issues counts.
- [ ] **Step 2: Add Recommended Next Steps section** — prioritised list of what to fix first based on severity and impact.
- [ ] **Step 3: Add Test Gap section** — summarise which tests to write, in priority order.
- [ ] **Step 4: Mark report as Complete**
- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/specs/site-audit-report.md
git commit -m "Complete full site audit report with recommendations"
```

- [ ] **Step 6: Present summary to user** — highlight top 5 findings and recommended next steps.
