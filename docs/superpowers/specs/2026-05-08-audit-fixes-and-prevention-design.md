# Audit fixes and prevention — design

Date: 2026-05-08
Status: Draft for implementation

## Summary

A comprehensive site audit surfaced 17 issues across 21 files. Severities range from critical correctness bugs (a Next.js `redirect()` swallowed by `try/catch`, a settings page accessible to non-admins) to UX problems (raw error messages displayed to users, modal accessibility gaps).

This spec lands those fixes in one PR and follows up with a second PR that adds prevention infrastructure — small helpers, a custom ESLint rule, end-to-end tests for auth boundaries, and a conventions document — so this class of bug becomes harder to write next time.

## Goals

- Land all 17 audit findings without regressions: typecheck, lint, unit tests (700/700), build, and existing e2e suite continue to pass.
- Replace the ad-hoc patterns that produced the worst bugs (redirect-in-try-catch, missing role checks on pages, raw `JSON.parse` of request bodies) with reusable helpers that make the right thing the easy thing.
- Add lint rules and end-to-end tests so the same bugs cannot land unnoticed again.
- Document the conventions in a single short, scannable file so future contributors (human or agent) have a checklist to follow.

## Non-goals

- Wholesale migration of existing pages (33) or API routes (55) to the new helpers. New helpers are available; existing code migrates piecemeal as it's touched. (Option D from brainstorming, deliberately rejected.)
- Replacing the custom `Sheet` and `Dialog` primitives with Radix. The custom implementations are now accessible enough.
- Adding Zod schemas to API routes that don't have them today.
- Resolving the 6 npm-audit "moderate" findings — all are dev/build-time only and require major-version downgrades of `drizzle-kit` / `next`.
- Fixing the worktree lockfile warning surfaced by Next 16's build (a pre-existing workspace-detection issue, not introduced here).

---

## PR 1 — Audit cleanup

The 17 fixes are already present in the working tree on branch `claude/funny-mendel-39bf20`. This PR commits them.

### Scope

21 files, +315/-129 lines. Static checks all pass: typecheck (exit 0), lint (exit 0), 700/700 unit tests pass, build succeeds with no warnings (the previous Cache-Control warning is gone).

### Findings by severity

**Critical (correctness/security):**

1. `redirect()` swallowed by `try/catch` in three pages. Next.js 16's `redirect()` throws `NEXT_REDIRECT`; wrapping in `try/catch` with `console.error` silently breaks the redirect.
   - `src/app/(app)/dashboard/page.tsx`: users with no churches were not redirected to `/onboarding`.
   - `src/app/(app)/churches/[churchId]/settings/service-patterns/page.tsx`: non-admin redirect was overridden by the catch block, sending users to `/churches` instead of `/churches/{id}/services`.
   - `src/app/(app)/churches/[churchId]/settings/templates/page.tsx`: same pattern as above.
2. `src/app/(app)/churches/[churchId]/settings/page.tsx`: no ADMIN check. Any member could view the settings page via direct URL.
3. Three pages redirected `requireChurchRole` failures to `/login` — but the user is already authenticated, so middleware bounces them to `/dashboard`. Fixed to redirect to `/churches`:
   - `src/app/(app)/churches/[churchId]/page.tsx`
   - `src/app/(app)/churches/[churchId]/services/page.tsx`
   - `src/app/(app)/churches/[churchId]/services/[date]/page.tsx`
4. `src/app/(auth)/login/page.tsx`: open redirect via protocol-relative URL. `?redirect=//evil.com` passed `startsWith("/")`. Fixed by also rejecting `//` and `/\` prefixes.
5. `next.config.ts`: `Cache-Control` override for `/_next/static/*` is a no-op (Next.js sets immutable headers itself and forbids overrides), causing a build warning. Removed.

**High (UX / data exposure):**

6. `src/app/(app)/churches/[churchId]/planning/cell-autocomplete.tsx`: clicking an option committed the wrong one. `setHighlight(i)` is async; the synchronous `commitSelection()` call read stale `highlight`. Fixed by passing the index explicitly.
7. `src/app/api/churches/[churchId]/planning/cell/route.ts` and `bulk/route.ts`: unguarded `req.json()` and ad-hoc casts of `serviceType`/`column`/`date`. Now validate against `serviceTypeEnum`, `COLUMN_ORDER`, and an ISO-date regex before entering the transaction.
8. `src/components/ui/sheet.tsx`: missing `role="dialog"`, `aria-modal`, focus trap, focus restoration, and Escape handling. Now matches the existing `Dialog` primitive's accessibility.
9. `src/app/(app)/churches/[churchId]/planning/csv-import-modal.tsx`: `alert("Import failed")`, no `role="dialog"`, no Escape, no error handling for `FileReader.onerror`. Now uses the toast system and has full a11y.
10. `src/components/error-boundary.tsx`: displayed raw `error.message` to users (could leak DB IDs, file paths). Now logs to console and shows a generic message.
11. `src/app/(auth)/reset-password/page.tsx`: leaked raw Supabase `updateError.message`. Now matches "expired/invalid token" patterns and shows a friendly message; otherwise generic.
12. `src/app/(app)/account/page.tsx`: data export failed silently (no error feedback) and revoked the object URL synchronously, which can cancel downloads in Firefox/Safari. Fixed both.
13. `src/app/not-found.tsx`: linked unauthenticated users to `/dashboard`, which middleware bounces to `/login`. Now points to `/`.
14. `src/components/ui/toast.tsx`: error toasts used `aria-live="polite"`. Now `role="alert"` + `aria-live="assertive"` for type=error so screen readers announce immediately.

**Medium (cleanup):**

15. `src/app/(app)/dashboard/page.tsx`: three redundant `slice(0,1).map()` blocks consolidated to one conditional.
16. Two test files had unused imports (`beforeEach`, `vi`) — removed.
17. *(Subsumed by #14 — toast a11y)*.

### PR description

Reuses the audit summary from the audit conversation. Sections: *Critical bugs fixed*, *High-impact UX/quality fixes*, *Cleanup*, *What I deliberately did not change*.

### Verification (already complete)

- `npm run typecheck`: exit 0
- `npm run lint`: exit 0
- `npm test`: 700/700 pass
- `npm run build`: exit 0, "Compiled successfully", no warnings

---

## PR 2 — Prevention

Adds infrastructure so the bugs from PR 1 are harder to write again. Six pieces:

### 1. Helper: `requirePageAuth`

**File:** `src/lib/auth/page-auth.ts` (new)

**Signature:**

```ts
type PageAuthOptions = {
  churchId?: string;
  role?: MemberRole; // EDITOR or ADMIN; omit for any membership
};

type PageAuthResult = {
  user: typeof users.$inferSelect;
  membership: typeof churchMemberships.$inferSelect | null;
};

export async function requirePageAuth(opts?: PageAuthOptions): Promise<PageAuthResult>;
```

**Behaviour:**

- No session → `redirect("/login")`.
- Session but no DB user row → `redirect("/login")` (failed signup recovery).
- `churchId` provided but no membership → `redirect("/churches")`.
- `role` provided but membership role is below it → `redirect("/churches/{churchId}")`.
- All checks pass → returns `{ user, membership }`.

**Why this exists:** the audit found that pages used three different patterns for this check. One redirected to `/login` on permission errors (wrong destination, causes bounce loop). Another wrapped the check in try/catch, swallowing the redirect. This helper picks the right destination once.

**Tests:** unit tests for each redirect branch using mocks of `getAuthUser` and `getChurchMembership`.

**Migration:** new pages use it. Existing pages continue to work; they migrate when next touched.

### 2. Helper: `parseJsonBody`

**File:** `src/lib/api/parse-body.ts` (new)

**Signature:**

```ts
type ParseResult<T> =
  | { data: T; error: null }
  | { data: null; error: NextResponse };

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>>;
```

**Behaviour:**

- Invalid JSON → `error = NextResponse.json({ error: "Invalid JSON" }, { status: 400 })`.
- Schema validation fails → `error = NextResponse.json({ error: <first issue message> }, { status: 400 })`.
- Success → `data` typed as `T`.

**Why this exists:** several routes (especially the planning cell/bulk routes) crashed on malformed bodies because `req.json()` was unguarded. This collapses three lines of boilerplate into one call.

**Tests:** unit tests for invalid JSON, schema failure, success.

### 3. Helper: `safeRedirectPath`

**File:** `src/lib/auth/safe-redirect.ts` (new)

**Signature:**

```ts
export function safeRedirectPath(input: string | null | undefined, fallback?: string): string;
```

**Behaviour:**

- Returns `input` if it starts with `/` and not `//` or `/\`.
- Otherwise returns `fallback` (default `/dashboard`).

**Why this exists:** the login page had this logic inline and missed the protocol-relative case in its first version. Centralizing it eliminates the per-callsite mistake.

**Refactor:** `src/app/(auth)/login/page.tsx` switches from its inline check to this helper.

**Tests:** unit tests for `/path`, `//evil.com`, `/\evil.com`, `https://evil.com`, `null`, `undefined`, empty string, fallback override.

### 4. Component: `ConfirmDialog`

**Files:**
- `src/components/ui/confirm-dialog.tsx` (new) — wraps existing `Dialog` primitive.
- `src/components/ui/use-confirm.tsx` (new) — hook returning `confirm(message, opts)` → `Promise<boolean>`.

**API:**

```tsx
const confirm = useConfirm();
// in an event handler:
const ok = await confirm({
  title: "Delete this template?",
  description: "This cannot be undone.",
  confirmLabel: "Delete",
  destructive: true,
});
if (ok) doIt();
```

**Why this exists:** three places in the codebase use `window.confirm()`. The browser-native dialog is unstyleable, blocks the main thread, and looks out of place against the rest of the UI. The new component matches the app's design system and works with the existing focus-trap/aria-modal infrastructure.

**Migration (this PR):**
- `src/app/(app)/churches/[churchId]/settings/templates/template-admin-client.tsx:123`
- `src/app/(app)/churches/[churchId]/services/[date]/service-planner.tsx:171`
- `src/app/(app)/churches/[churchId]/services/[date]/section-row.tsx:170`

Each callsite changes from `if (window.confirm("..."))` to `if (await confirm({...}))`.

**Tests:** an interactive Vitest + Testing Library test that opens the dialog and verifies focus, escape, and resolution.

### 5. Lint rules

**Built-in additions** in `eslint.config.mjs`:

```js
"no-restricted-globals": [
  "error",
  { name: "alert",   message: "Use the toast system (useToast) instead." },
  { name: "confirm", message: "Use ConfirmDialog / useConfirm() instead." },
  { name: "prompt",  message: "Use a real form/dialog instead." },
],
```

After PR 1 + the `confirm()` migration above, this rule is clean. No `// eslint-disable` needed anywhere.

**Custom rule: `tools/eslint-rules/no-redirect-in-try.js`** (new, ~40 lines)

**Detects:** a `CallExpression` whose callee resolves to the `redirect` import from `next/navigation`, and whose ancestor chain crosses a `TryStatement.block` (not `.handler`).

**Errors with:**
> `redirect()` throws `NEXT_REDIRECT` and is swallowed by `try/catch`. Move the call after the `try` block, or fix the `catch` to re-throw redirects.

**Opt-out:** `// eslint-disable-next-line precentor/no-redirect-in-try` per-line, with a comment explaining why (typically: the catch is for non-redirect errors only and immediately re-throws or returns, but the rule can't always see that).

**Wired in via** flat-config local-plugin pattern:

```js
import noRedirectInTry from "./tools/eslint-rules/no-redirect-in-try.js";
// ...
{
  plugins: { precentor: { rules: { "no-redirect-in-try": noRedirectInTry } } },
  rules: { "precentor/no-redirect-in-try": "error" },
}
```

**False-positive constraints:**
- Only fires on `redirect` imported from `next/navigation` *in the same file* (not on every function called `redirect`).
- Does not fire when the call is inside a `catch` block (intentional — catch-then-redirect is a valid pattern when the catch re-throws or returns).
- Does not fire when the call is inside a function declared *outside* the try (helper functions don't trigger the rule).

**Known coverage gap:** the rule cannot statically detect when a *helper that throws a redirect* (like `requirePageAuth`, which calls `redirect()` internally) is called inside a `try` block. The redirect would be swallowed there too, but tracing across function boundaries is beyond AST-level analysis. Mitigation: the new-page checklist in `docs/conventions.md` explicitly says "do not wrap `requirePageAuth` in `try/catch`," and the helper's JSDoc says the same. Future work could add a small allowlist of "throws redirect" helper names if this becomes a recurring problem.

**Tests:** the rule ships with a test file (`tools/eslint-rules/no-redirect-in-try.test.js`) using ESLint's `RuleTester`, covering: positive cases (redirect in try block), negative cases (redirect outside try, redirect in catch, redirect in helper called from try), and the disable-comment opt-out.

### 6. End-to-end tests: auth boundaries

**File:** `e2e/auth-boundaries.spec.ts` (new)

**Scenarios:**

1. A `MEMBER`-role user navigates to `/churches/{id}/settings`. Lands on `/churches/{id}` (the new ADMIN gate).
2. A `MEMBER`-role user navigates to `/churches/{id}/settings/templates`. Lands on `/churches/{id}/services` (correct role-deny destination).
3. An authenticated user with no church membership navigates to `/churches/{nonExistentId}`. Lands on `/churches`, not `/login`.
4. A user logs in with `?redirect=//evil.com`. Lands on `/dashboard` (rejected redirect).
5. A user logs in with `?redirect=/account`. Lands on `/account` (legitimate redirect still works).

**Fixtures:** scenarios 1 and 2 require a `MEMBER`-role user. Check `e2e/global-setup.ts` early — if the existing fixtures don't seed a member, the smallest expansion to add one is in scope; if they do, we use them.

**Mitigation for fixture risk:** if `global-setup.ts` doesn't already seed multi-role users, this PR adds *only* what these five scenarios need (one member-role user in one church). It does not become a full fixture overhaul.

### 7. Documentation

**File:** `docs/conventions.md` (new)

Three short checklists. Aim for ~one screen of text total — if it takes more than two minutes to read, no one will follow it.

**New page checklist:**
- [ ] Calls `requirePageAuth({ churchId?, role? })` if it needs auth.
- [ ] If it has a `<main>` wrapper, the wrapper has `id="main-content"` (skip-to-content target).
- [ ] All `redirect()` calls are outside any `try/catch` (or the catch re-throws). The lint rule enforces this for direct calls.
- [ ] `requirePageAuth` (which throws redirect internally) is **not** wrapped in `try/catch`. The lint rule cannot catch this — it's a convention.
- [ ] Page exports a metadata object if it's user-visible content.

**New API route checklist:**
- [ ] Calls `requireChurchRole(churchId, role)` or `requireAuth()`.
- [ ] If the route accepts a body: parses via `parseJsonBody(req, schema)` with a Zod schema.
- [ ] Returns appropriate status codes: 400 (validation), 401 (no auth), 403 (insufficient role), 404 (not found), 409 (conflict), 500 (unexpected).
- [ ] Logs unexpected errors via `logger`, not `console.error`.

**New modal/dialog checklist:**
- [ ] Built on the `Dialog` primitive (not a raw `<div>`).
- [ ] Has `aria-labelledby` pointing at the title element.
- [ ] Closes on Escape and on overlay click.
- [ ] First focusable element receives focus on open; previously-focused element receives focus on close.
- [ ] Close button has `aria-label="Close"` and visible affordance.

**File:** `AGENTS.md` — addendum (one paragraph)

> ### Conventions
> Before writing a new page, API route, or dialog, check `docs/conventions.md` for the relevant checklist. The conventions are enforced by ESLint rules where possible — see `eslint.config.mjs` and `tools/eslint-rules/`.

---

## Sequencing within PR 2

Each step should be a clean commit; the branch is testable at every step.

1. Add helpers (`page-auth`, `parse-body`, `safe-redirect`) with unit tests. No callers changed yet.
2. Add `ConfirmDialog` + `useConfirm` with an interactive test. No callsites migrated yet.
3. Migrate the 3 `window.confirm()` callsites to `useConfirm`. Hand-test each.
4. Refactor `login/page.tsx` to use `safeRedirectPath`.
5. Add the custom ESLint rule + the built-in `no-restricted-globals` rule. Run `npm run lint` — should be clean (PR 1 + step 3 already eliminated all violations).
6. Add `e2e/auth-boundaries.spec.ts`. Run `npm run test:e2e` — should pass.
7. Add `docs/conventions.md` and the AGENTS.md addendum.

---

## Risks

**`requirePageAuth` semantics.** It throws `NEXT_REDIRECT` (via `redirect()`); callers must not wrap it in `try/catch`. The new lint rule helps catch misuse — but the helper itself uses `redirect()` internally, so we need the rule to scope to `redirect` imports *in the same file* to avoid flagging the helper's own implementation. Confirmed in the rule's design above.

**ESLint rule false positives.** Some pages have `redirect()` inside a `catch` legitimately — e.g., catching a Supabase error and redirecting to `/login?error=auth`. The rule explicitly does not fire on `catch`-block redirects (only on `try`-block redirects). For edge cases, `// eslint-disable-next-line precentor/no-redirect-in-try` with a comment is the documented escape hatch.

**`useConfirm` ergonomics.** A hook returning a function returning a Promise is a slightly unusual pattern. Real usage (the 3 callsites) is all in event handlers (`async onClick`), where `await confirm()` reads naturally. Rendering-time use (e.g., a confirm during a server-action result) is not supported and will be caught at the type level (`useConfirm` requires a hook context).

**E2E fixture scope.** Scenarios 1 and 2 require a member-role test user. If `e2e/global-setup.ts` doesn't already seed one, we add it in this PR — but only the minimum needed, not a fixture overhaul.

**Test-only or staging Supabase for E2E.** New e2e tests require a Supabase environment that allows test-user creation. The existing CI already runs e2e (`.github/workflows/ci.yml` `e2e` job), so this infrastructure exists. Verifying the new tests run cleanly in CI is part of completion.

---

## Out of scope (logged for later)

- Migrating all 33 pages to `requirePageAuth`. Pages migrate as they're touched.
- Migrating all 55 API routes to `parseJsonBody` + Zod. Routes migrate as they're touched.
- Replacing the custom `Sheet`/`Dialog` primitives with Radix.
- Adding Zod schemas to API routes that don't have them.
- Resolving `npm audit` "moderate" findings (all dev/build-only, requires major-version downgrades).
- Worktree lockfile warning from `next build` (workspace-detection issue, pre-existing).

---

## Definition of done

- PR 1 merged: typecheck, lint, unit tests, build, e2e all green.
- PR 2 merged: same as above, plus:
  - `tools/eslint-rules/no-redirect-in-try.test.js` passes.
  - `e2e/auth-boundaries.spec.ts` passes (5 scenarios).
  - `docs/conventions.md` exists and is linked from AGENTS.md.
  - Running `npm run lint` produces no `// eslint-disable-next-line no-restricted-globals` or `precentor/no-redirect-in-try` comments anywhere in `src/`.
