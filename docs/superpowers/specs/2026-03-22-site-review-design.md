# Precentor Full Site Review — Design Spec

**Date**: 2026-03-22
**Scope**: Systematic review, testing, and improvement of the entire Precentor site
**Approach**: Page-by-page sequential review using Claude Code plugins
**Fix strategy**: Audit-first with quick wins fixed inline

---

## 1. Tool Strategy

Each Claude Code plugin has a distinct role:

| Plugin | Role | When |
|--------|------|------|
| **Claude Preview** | Primary review tool | Every page — screenshots, snapshots, CSS inspection, network, console logs, responsive testing |
| **Playwright MCP** | Automated interaction testing | Form submissions, multi-step flows, dialog handling, file uploads |
| **Claude in Chrome** | Real browser verification | Final visual checks, real browser quirks, complex auth state |
| **Source code review** | Static analysis | Read each page's files — security, error handling, patterns, types |
Claude Preview is the workhorse. Playwright handles interaction sequences. Claude in Chrome is the fallback for anything needing a real browser.

### Prerequisite: Next.js 16 Documentation

Per `AGENTS.md`, this project uses Next.js 16.2.0 which has breaking changes from prior versions. **Before writing or modifying any code**, read the relevant guides in `node_modules/next/dist/docs/`. This applies to every quick win fix — never assume prior Next.js knowledge is current.

---

## 2. Per-Page Review Protocol (7-Point Checklist)

Every page goes through these checks in fixed order:

### 2.1 Visual Review
- `preview_screenshot` at desktop (1280x800)
- Check: layout integrity, alignment, whitespace, typography hierarchy, colour consistency
- Fix quick wins: obvious CSS bugs, misalignment, missing content

### 2.2 Responsive Testing
- `preview_resize` to mobile (375x812), tablet (768x1024), back to desktop
- `preview_screenshot` at each breakpoint
- Check: overflow, text truncation, touch target sizes, stacking order, navigation collapse

### 2.3 Accessibility Audit
- `preview_snapshot` for accessibility tree — semantic structure, ARIA roles, heading hierarchy
- `preview_eval` to inject axe-core from CDN and run it:
  ```js
  // Inject axe-core, then run and return violations
  await (async () => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js';
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
    const results = await axe.run();
    return JSON.stringify(results.violations, null, 2);
  })()
  ```
- Check: colour contrast, focus order, screen reader labels, alt text, form labels

### 2.4 Runtime Health
- `preview_console_logs` (level: error) — JS errors, React hydration warnings, unhandled promises
- `preview_network` (filter: failed) — 404s, failed API calls, CORS issues
- Check: no errors in console, no failed network requests

### 2.5 CSS & Design System Compliance
- `preview_inspect` on key elements (headings, buttons, cards, inputs) — computed styles
- Check: consistent Tailwind design tokens, no hardcoded colours/spacing, dark mode readiness

### 2.6 Interaction Testing (where applicable)
- Use Playwright MCP or Preview click/fill to test forms, buttons, navigation links
- Check: form validation fires, error states display, success states work, correct routing

### 2.7 Source Code Review
- Read the page's source file(s) and its wrapping layout file(s) — see file path mapping in Section 3
- **Before any code fix**: consult `node_modules/next/dist/docs/` for the relevant Next.js 16 API (per AGENTS.md)
- Check: security (XSS, injection, auth guards), error boundaries, loading/error states, TypeScript strictness, missing edge cases

### 2.8 Performance Baseline (lightweight)
- `preview_network` to capture total page weight (number of requests, total transfer size)
- `preview_eval` to check basic Web Vitals if available (`performance.getEntriesByType('navigation')`)
- Check: no unexpectedly large assets, no waterfall blocking, reasonable load time
- This is a baseline capture, not a deep performance audit — flag obvious outliers only

### Severity Classification
- **Quick win** — fixed immediately (typos, missing alt text, obvious CSS bugs)
- **Medium** — clear fix, logged for second pass
- **Major** — architectural or design decision needed, flagged for user

---

## 3. Page Order

Review follows user-journey order to catch flow breaks naturally.

### Route Group Structure

The project uses Next.js route groups. All source paths are relative to `src/app/`:

- `(auth)/` — public auth pages (login, signup, forgot/reset password, invite)
- `(app)/` — authenticated pages (dashboard, churches, onboarding)
- `(app)/layout.tsx` — shared layout for all authenticated pages (sidebar, auth guard)
- `(app)/churches/[churchId]/layout.tsx` — shared layout for all church sub-pages

### Phase 1: Public Pages (no auth)

| # | URL | Source File |
|---|-----|------------|
| 1 | `/` | `page.tsx` (root) |
| 2 | `/login` | `(auth)/login/page.tsx` |
| 3 | `/signup` | `(auth)/signup/page.tsx` |
| 4 | `/forgot-password` | `(auth)/forgot-password/page.tsx` |
| 5 | `/reset-password` | `(auth)/reset-password/page.tsx` |
| 6 | `/invite/[token]` | `(auth)/invite/[token]/page.tsx` |
| 7 | `/non-existent-route` | Test 404 behaviour (no source file — verify error UX) |

### Phase 2: Onboarding (auth required — credentials requested)

| # | URL | Source File |
|---|-----|------------|
| 8 | `/onboarding` | `(app)/onboarding/page.tsx` |

### Phase 3: Dashboard

| # | URL | Source File |
|---|-----|------------|
| 9 | `/dashboard` | `(app)/dashboard/page.tsx` |
| 10 | `/dashboard/lectionary` | `(app)/dashboard/lectionary/page.tsx` |

### Phase 4: Church Management

| # | URL | Source File |
|---|-----|------------|
| 11 | `/churches` | `(app)/churches/page.tsx` |
| 12 | `/churches/new` | `(app)/churches/new/page.tsx` |
| 13 | `/churches/[churchId]/sundays` | `(app)/churches/[churchId]/sundays/page.tsx` |
| 14 | `/churches/[churchId]/sundays/[date]` | `(app)/churches/[churchId]/sundays/[date]/page.tsx` |
| 15 | `/churches/[churchId]/members` | `(app)/churches/[churchId]/members/page.tsx` |
| 16 | `/churches/[churchId]/repertoire` | `(app)/churches/[churchId]/repertoire/page.tsx` |
| 17 | `/churches/[churchId]/rota` | `(app)/churches/[churchId]/rota/page.tsx` |
| 18 | `/churches/[churchId]/service-sheets` | `(app)/churches/[churchId]/service-sheets/page.tsx` |
| 19 | `/churches/[churchId]/settings` | `(app)/churches/[churchId]/settings/page.tsx` |

### Phase 5: Cross-Cutting Concerns

20. **Layout files** — `layout.tsx` (root), `(app)/layout.tsx`, `(app)/churches/[churchId]/layout.tsx`
21. **API routes** — All `api/` handlers (see API review checklist below)
22. **Middleware** — `proxy.ts`, auth middleware, route protection
23. **Shared components** — `components/ui/`, `error-boundary.tsx`, `church-sidebar.tsx`
24. **Test coverage gaps** — Compare existing tests against findings, write missing tests
25. **CI/CD pipeline** — Review `.github/workflows/ci.yml`, ensure it catches what we found

### API Route Review Checklist

API routes cannot be visually tested. Each handler is reviewed against this checklist:

1. **Auth guard** — Is the route protected? Does it verify the user has permission for the resource?
2. **Input validation** — Are request body/params validated with Zod or equivalent? Sanitised?
3. **Error responses** — Correct HTTP status codes? No data leaks in error messages?
4. **Error handling** — Are database/external service errors caught and handled gracefully?
5. **CSRF protection** — Are state-changing routes protected against cross-site request forgery?
6. **Rate limiting** — Is there protection against abuse on sensitive endpoints (auth, AI, search)?

---

## 4. Audit Report Format

Findings accumulate in `docs/superpowers/specs/site-audit-report.md`:

```markdown
# Precentor Site Audit Report
Date: 2026-03-22
Status: In Progress / Complete

## Summary
- Pages reviewed: X/23
- Quick wins fixed: X
- Medium issues: X
- Major issues: X

## Per-Page Findings

### / (Landing Page)
**Visual**: Pass/Fail
**Responsive**: Pass/Fail
**Accessibility**: Pass/Fail
**Runtime**: Pass/Fail
**Design System**: Pass/Fail
**Interactions**: Pass/Fail/N/A
**Source Code**: Pass/Fail

Findings:
- [QUICK WIN] Fixed: description
- [MEDIUM] Description
- [MAJOR] Description
```

### Deliverables at Completion
1. **Audit report** — full findings by page with severity
2. **Quick wins already fixed** — committed as found
3. **Medium issues list** — ready for second pass
4. **Major issues list** — flagged for user decision
5. **Test gap analysis** — pages/flows lacking coverage, proposed tests
6. **Recommended next steps** — prioritised action list

---

## 5. Session Flow

### Startup
1. Create `.claude/launch.json` with dev server config
2. `preview_start` to boot Next.js dev server
3. Verify server health via `preview_screenshot`
4. Create audit report file with header
5. Begin Phase 1

### Per-Page Loop
```
For each page:
  1. Navigate to page
  2. Desktop screenshot — visual check
  3. Mobile resize — screenshot — responsive check
  4. Tablet resize — screenshot — responsive check
  5. Desktop resize (restore)
  6. Snapshot — accessibility tree check
  7. Eval axe-core — programmatic a11y audit
  8. Console logs (errors) — runtime check
  9. Network requests (failed) — runtime check
  10. Inspect key elements — design system check
  11. Interact with forms/buttons if present
  12. Read source file(s) — code review
  13. Log findings to audit report
  14. Fix any quick wins (consult Next.js 16 docs first), re-screenshot to verify, then commit
```

### Auth Transition
After Phase 1, pause and request test credentials from the user.

**Authentication method**: The app uses Supabase email/password auth. Log in via the `/login` page using `preview_fill` to enter email and password, then `preview_click` to submit. The Preview browser session will carry auth cookies through Phases 2–4.

**Requirements for meaningful testing**: The test account should have at least one church with members, services, and music data seeded — otherwise church sub-pages will show empty states only.

**Fallback if credentials unavailable**: Skip to Phase 5 (cross-cutting concerns — API routes, middleware, components, tests) while waiting. Return to Phases 2–4 when credentials arrive.

### Error Recovery
- Dev server crash: `preview_logs` to diagnose, `preview_stop` + `preview_start` to restart
- Page won't load: log as finding, skip to next, revisit later
- Preview can't handle something: fall back to Playwright MCP or Claude in Chrome

### Git Strategy
- Quick win fixes: committed individually with descriptive messages
- Audit report: updated and committed after each phase completes
- All work on `claude/awesome-colden` branch
