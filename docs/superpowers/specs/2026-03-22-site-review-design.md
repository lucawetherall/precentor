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
| **Scheduled Tasks** | Session monitoring | Dev server health checks, re-run audit checklist after fixes |

Claude Preview is the workhorse. Playwright handles interaction sequences. Claude in Chrome is the fallback for anything needing a real browser.

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
- `preview_eval` to inject and run axe-core — WCAG 2.1 AA violations
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
- Read the page's source file(s)
- Check: security (XSS, injection, auth guards), error boundaries, loading/error states, TypeScript strictness, missing edge cases

### Severity Classification
- **Quick win** — fixed immediately (typos, missing alt text, obvious CSS bugs)
- **Medium** — clear fix, logged for second pass
- **Major** — architectural or design decision needed, flagged for user

---

## 3. Page Order

Review follows user-journey order to catch flow breaks naturally.

### Phase 1: Public Pages (no auth)
1. `/` — Landing page
2. `/login` — Login form
3. `/signup` — Registration form
4. `/forgot-password` — Password reset request
5. `/reset-password` — Password reset form
6. `/invite/[token]` — Invite acceptance (test with invalid token for error handling)

### Phase 2: Onboarding (auth required — credentials requested)
7. `/onboarding` — Post-signup church setup wizard

### Phase 3: Dashboard
8. `/dashboard` — Main dashboard
9. `/dashboard/lectionary` — Lectionary sync & calendar

### Phase 4: Church Management
10. `/churches` — Church list
11. `/churches/new` — Create new church
12. `/churches/[churchId]/sundays` — Service planning calendar
13. `/churches/[churchId]/sundays/[date]` — Individual service editor
14. `/churches/[churchId]/members` — Member management + invite form
15. `/churches/[churchId]/repertoire` — Performance history
16. `/churches/[churchId]/rota` — Choir rota grid
17. `/churches/[churchId]/service-sheets` — Service sheet generation
18. `/churches/[churchId]/settings` — Church settings

### Phase 5: Cross-Cutting Concerns
19. **API routes** — All `/api/` handlers: security, validation, error handling
20. **Middleware** — Auth proxy, route protection
21. **Shared components** — `ui/` components, error boundary, sidebar
22. **Test coverage gaps** — Compare existing tests against findings, write missing tests
23. **CI/CD pipeline** — Review `ci.yml`, ensure it catches what we found

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
  14. Fix any quick wins, commit
```

### Auth Transition
After Phase 1 (6 public pages), pause and request test credentials. Once authenticated, Preview browser session carries auth cookies through Phases 2–4.

### Error Recovery
- Dev server crash: `preview_logs` to diagnose, `preview_stop` + `preview_start` to restart
- Page won't load: log as finding, skip to next, revisit later
- Preview can't handle something: fall back to Playwright MCP or Claude in Chrome

### Git Strategy
- Quick win fixes: committed individually with descriptive messages
- Audit report: updated and committed after each phase completes
- All work on `claude/awesome-colden` branch
