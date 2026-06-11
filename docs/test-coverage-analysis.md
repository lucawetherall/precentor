# Test Coverage Analysis & Improvement Proposals

_Date: 2026-06-11_

> **Update (same day):** the first wave of fixes from this analysis has landed
> in this PR. Implemented so far:
> - **Coverage tooling** wired up (`@vitest/coverage-v8`, `coverage` block in
>   `vitest.config.ts`, `npm run test:coverage`). Baseline is ~44% statements
>   over `src/lib/**` + `src/app/api/**`.
> - **Search builders:** `escapeLike` extracted to a single shared module
>   (`src/lib/search/escape-like.ts`) and imported by all five search files;
>   the misleading test now imports the real function; added branch tests for
>   `searchHymns` (numeric/book/verse-count) and `searchAnthems` (scope clause).
> - **AI quota:** `consumeAiQuota` now tested (boundary, env override,
>   fail-open).
> - **Highest-risk routes:** added route tests for `invites/[token]` (GET),
>   `invites/[token]/accept` (auth + email guards + response mapping), and
>   `members/[memberId]` (PATCH/DELETE authorization + last-admin guard).
>
> **Update 2 (same day):** the remaining lower-risk follow-ups have now also
> landed:
> - **Every API route is now tested.** All 55 `route.ts` handlers have a
>   colocated suite (was ~20). The new ones cover auth/role-gating, body
>   validation, not-found/conflict paths, and error mapping for the search
>   routes, church/user/cron/AI endpoints, planning bulk+cell, music-list,
>   sheets, service detail, sections (×3), service-patterns (×2) and
>   templates (×2).
> - **Interactive UI primitives:** added tests for the toast system
>   (`useToast` guard, auto-dismiss, error-toast persistence + a11y roles,
>   manual dismiss) and the `ErrorBoundary` (fallback rendering, custom
>   fallback, no message leak, reset-to-children). `useConfirm` was already
>   covered via `confirm-dialog`.
> - **CI coverage ratchet:** thresholds added to `vitest.config.ts` and CI now
>   runs `npm run test:coverage`, so coverage can only go up.
>
> Coverage rose from ~44% to **67.4%** statements over `src/lib` + `src/app/api`
> (1018 tests across 136 files, all green).

## Summary

The codebase has a healthy testing **culture** — 95 colocated unit/component
test suites plus 9 Playwright E2E specs, with strong coverage of the
liturgical/lectionary domain logic, PDF/DOCX builders, permissions, and the
role-slot / preset migration work. The gaps are concentrated in three places:

1. **API route handlers** — only ~20 of 55 `route.ts` files have a colocated
   test. The untested third includes several security- and data-integrity-
   sensitive endpoints.
2. **The AI module** (`src/lib/ai/*`) and the **search query builders**
   (`src/lib/search/*`) have effectively zero real coverage.
3. **No coverage measurement** is wired up, so these gaps are invisible in CI.

Below are concrete, prioritised proposals.

---

## What is well covered (keep it up)

- **Lectionary & calendar** — `calendar`, `calendar-edge-cases`, `mapper`,
  `track`, `bible-books(-edge)`. The hardest domain logic is well tested.
- **Service generation domain** — `auto-generate`, `collect-resolution`,
  `completeness`, `seasonal-rules`, `template-resolution`, `verse-selection`,
  `adjacent-liturgical-days`.
- **PDF / music-list builders** — sheet data, styles, template resolution,
  DOCX, ordinals, label mapping, period subtitle.
- **Auth/permissions** — `permissions(-edge)`, `page-auth`, `safe-redirect`,
  `super-admin`, `public-paths`, `coerce-member-role`.
- **Role-slot & preset migration** — preset/slot routes, migration phases.

---

## Priority 1 — Untested API routes with security / data-integrity weight

Only ~20/55 route handlers have a colocated `route.test.ts`. The following
untested routes carry real risk and should be covered first:

| Route | Why it matters |
|-------|----------------|
| `invites/[token]/route.ts` + `invites/[token]/accept/route.ts` | Token-based auth boundary. No test asserts behaviour for expired/used/invalid tokens, wrong-email acceptance, or that accepting grants the **correct** church role. This is the riskiest untested surface. |
| `churches/[churchId]/route.ts` | Church update/delete — needs role-gating tests (who can rename/delete a church). |
| `churches/[churchId]/members/[memberId]/route.ts` | PATCH/DELETE member: role-change and removal authorization (e.g. can a non-admin demote an admin? can the last admin be removed?). Only `invite-create` is currently tested on the members surface. |
| `churches/route.ts` | Church create/list — ownership scoping. |
| `user/route.ts` + `user/export/route.ts` | Account mutation and GDPR-style data export — must scope strictly to the caller. |
| `churches/[churchId]/planning/bulk/route.ts` + `planning/cell/route.ts` | Bulk writes to the planning grid — validation, partial-failure, and authorization. The grid client/hook is tested but the write endpoints are not. |
| `churches/[churchId]/services/generate/route.ts` | Service generation entry point — the domain logic is tested but the route (auth, params, error mapping) is not. |
| `cron/log-performances/route.ts` | Cron endpoint. `cron-auth` is tested in isolation, but the handler's own behaviour isn't. |
| `ai/suggest-music/route.ts` | Calls Gemini + quota + rate limit; see Priority 2. |

**Proposal:** add route tests asserting, for each: (a) unauthenticated →
401/redirect, (b) wrong-church / insufficient-role → 403, (c) invalid body →
400 via the Zod schema, (d) happy path returns the expected shape. The existing
`presets/route.test.ts` and `rota/route.test.ts` are good templates.

---

## Priority 2 — The AI module has no coverage

`src/lib/ai/` (`gemini`, `provider`, `quota`, `types`) is entirely untested,
yet it contains subtle, correctness-critical logic:

- **`quota.ts` `consumeAiQuota`** — atomic UPSERT quota with deliberate
  **fail-open** semantics and an off-by-one boundary (`used <= limit`). These
  are exactly the behaviours that silently regress. Worth testing: boundary at
  the limit, the `AI_DAILY_QUOTA` env override, and the fail-open path when
  `db.execute` throws (mock the db).
- **`provider.ts` / `gemini.ts`** — provider selection and prompt/response
  shaping should be unit-tested with the SDK mocked.

**Proposal:** unit-test `consumeAiQuota` with a mocked `db`, and add a route
test for `ai/suggest-music` covering quota-exhausted (429) and rate-limited
responses.

---

## Priority 3 — Search query builders are only tested via a *copy* of their logic

`src/lib/search/{hymns,anthems,mass-settings,canticle-settings,responses-settings}.ts`
each define their own `escapeLike()` and build `ilike`/`or`/`and` Drizzle
clauses. The only test, `escape-like.test.ts`, **re-implements** `escapeLike`
inline rather than importing it:

```ts
// Extract the shared escapeLike logic for testing
function escapeLike(str: string): string { ... }  // a COPY, not the real one
```

So the test passes even if the real modules' escaping drifts or a copy is
edited. Two issues compound here:

- `escapeLike` is **duplicated** across five files (drift risk).
- The numeric-match branch (`if (!isNaN(Number(query)))`) and book-filter
  composition in `searchHymns` are untested.

**Proposal:** extract `escapeLike` into one shared util, import *that* into the
test, and add focused tests for each search builder's clause composition
(numeric vs text query, book filter present/absent). These are pure-ish and
cheap to test with a mocked `db`.

---

## Priority 4 — UI primitives & a few app routes

- **`src/components/ui/`**: 38 components, only 3 tested (`confirm-dialog`,
  plus `availability-widget` and `migration-banner` at the components root).
  Most primitives (`button`, `input`, `select`…) are low-value to test, but
  the **stateful/interactive** ones are worth it: `toast`/`useToast`,
  `use-confirm`, `dialog`, `error-boundary`, `command`, `dropdown-menu`. These
  encode focus/escape/portal behaviour that regresses easily.
- Untested **non-route** lib modules worth a look: `liturgical-display.ts`
  (user-facing label formatting), `churches/default-setup.ts` (new-church
  bootstrap — a bug here affects every new church), `db/queries/overview.ts`
  (235 LOC of aggregation feeding the dashboard).

---

## Priority 5 — Wire up coverage measurement (the meta-fix)

There is **no coverage tooling** configured (`vitest.config.ts` has no
`coverage` block, and no `@vitest/coverage-*` dep). Without it, the gaps above
are invisible and will recur.

**Proposal:**
1. Add `@vitest/coverage-v8`, enable `coverage` in `vitest.config.ts` with
   sensible excludes (`schema*.ts`, `*.d.ts`, generated/seed scripts, pure
   type files).
2. Add a `test:coverage` script and surface the summary in CI (non-blocking
   at first).
3. Once a baseline is known, set a **ratchet** threshold so coverage can only
   go up — focused on `src/lib/**` and `src/app/api/**` where the logic lives,
   not the UI primitives.

---

## Suggested order of work

1. Coverage tooling (Priority 5) — makes everything else measurable.
2. Invite/accept + member-mutation route tests (Priority 1) — highest risk.
3. AI quota + search-builder tests (Priorities 2–3) — small, high-value,
   fixes the misleading `escapeLike` test.
4. Remaining untested routes and interactive UI components.
