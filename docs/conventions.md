# Conventions

Short checklists for the most common things you'll add. Following these prevents the bug classes uncovered by the 2026-05 audit from coming back.

The lint rules in `eslint.config.mjs` and `tools/eslint-rules/` enforce the most important items automatically. The rest are conventions — if a checklist item can't be machine-checked, the lint rules tell you so explicitly.

---

## New page (`src/app/.../page.tsx`)

- [ ] Calls `requirePageAuth({ churchId?, role? })` from `@/lib/auth/page-auth` if it needs auth. **Don't** call `supabase.auth.getUser()` + DB lookup by hand — that's the pattern the audit replaced.
- [ ] If the page has a `<main>` wrapper, the wrapper has `id="main-content"` so the global skip-to-content link works.
- [ ] All `redirect()` calls are outside any `try/catch` block (or the catch re-throws). The lint rule `precentor/no-redirect-in-try` enforces this for direct calls.
- [ ] `requirePageAuth` (which calls `redirect()` internally) is **not** wrapped in `try/catch`. The lint rule cannot catch this — it's a convention the audit fix called out by name.
- [ ] If the page is user-visible content (marketing, public pages), it exports a `metadata` object.

---

## New API route (`src/app/api/.../route.ts`)

- [ ] Calls `requireChurchRole(churchId, role)` or `requireAuth()` from `@/lib/auth/permissions`. Cron and webhook routes that don't authenticate via session use bearer-token comparison via `timingSafeEqual` — see `api/cron/log-performances/route.ts`.
- [ ] If the route accepts a body: parses via `parseJsonBody(req, schema)` from `@/lib/api/parse-body`, with a Zod schema. **Don't** call `await req.json()` directly — that's the pattern the audit replaced.
- [ ] Returns appropriate status codes:
  - `400` — validation / malformed input
  - `401` — no auth
  - `403` — authenticated but insufficient role / not a member
  - `404` — resource missing or not visible to this user
  - `409` — conflict (e.g. optimistic-concurrency mismatch)
  - `500` — unexpected (use `apiError` from `@/lib/api-helpers` so the response shape stays consistent)
- [ ] Logs unexpected errors via `logger` (from `@/lib/logger`), not `console.error`. `logger` adds the request ID for tracing.

---

## New modal / dialog

- [ ] Built on the `Dialog` primitive from `@/components/ui/dialog` — not a raw `<div>`. The primitive provides focus trap, focus restoration, Escape, and overlay-click handling for free.
- [ ] Has `aria-labelledby` pointing at the title element's `id`.
- [ ] Closes on Escape and on overlay click (handled by `Dialog` if you use it).
- [ ] First focusable element receives focus on open; previously-focused element receives focus on close (handled by `Dialog`).
- [ ] Close button has `aria-label="Close"` and a visible affordance.

For confirmations specifically, use `useConfirm()` from `@/components/ui/use-confirm` — `if (await confirm({ title, description, destructive }))`. The `no-restricted-globals` lint rule blocks `window.confirm()`.

---

## Toasts and inline errors

- [ ] User-visible errors go through the toast system (`useToast()` from `@/components/ui/toast`) or a `role="alert"` `<p>`. **Don't** use `alert()` — the lint rule blocks it.
- [ ] Don't display raw `error.message` from caught exceptions in JSX. Show a generic friendly message and log the detail to the console / logger. Raw error messages can leak DB IDs, file paths, or token internals.

---

## Database / schema changes

Full detail lives in [`src/lib/db/AGENTS.md`](../src/lib/db/AGENTS.md) — it auto-loads when an agent works in that folder. The short version:

- [ ] Edit the table in `src/lib/db/schema-base.ts` (core) or `schema-liturgy.ts` (liturgy/templates), or a new `schema-<area>.ts` re-exported from `schema.ts`. **Never** hand-edit the `.sql` files in `drizzle/` — they're snapshots, not source of truth.
- [ ] Import schema from `@/lib/db/schema` (the barrel), not from the split files.
- [ ] Keep the change **additive** — new nullable columns, tables, or indexes. Renames, drops, type changes, and `NOT NULL`-without-default can break the drifted production DB or lose legacy data; flag those for a human instead of pushing.
- [ ] Apply with `npx drizzle-kit push` (inspect the generated SQL before confirming). If `DATABASE_URL` isn't set, append the change to `docs/superpowers/plans/DEFERRED_DB_PUSHES.md` and note the pending push in your summary.

---

## Server vs. client components

- [ ] Components are React **Server Components by default**. Only add `"use client"` when the file needs interactivity (state, effects, event handlers, browser APIs). Pushing `"use client"` to the leaf keeps server components — and their data fetching — out of the client bundle.
- [ ] Server-only modules (anything importing `@/lib/db`, `@/lib/auth/*`, secrets) start with `import "server-only";` so they can never be pulled into a client bundle. Keep that line when you edit them.
- [ ] Fetch data in server components and pass it down as props; don't fetch from `useEffect` when a server component could load it.

---

## Environment variables

- [ ] Read config through the `env` proxy from `@/lib/env` — **never** `process.env.X` directly. The proxy validates that required vars are present and gives them types.
- [ ] Adding a new variable means: add it to the `env` proxy in `src/lib/env.ts` **and** to `.env.example` (with a safe placeholder and a one-line comment). Only `NEXT_PUBLIC_*` vars are safe for client bundles.

---

## Tests

- [ ] Put tests in a `__tests__/` folder next to the code they cover (e.g. `src/lib/auth/__tests__/`). Unit tests run under Vitest (`npm run test`); end-to-end specs live in `e2e/` and run under Playwright (`npm run test:e2e`).
- [ ] New API routes and `lib` helpers should ship with at least one test. Run `npm run check` before claiming done.

---

## Lint rules summary

| Rule | What it catches | Where defined |
|------|-----------------|---------------|
| `no-restricted-globals` | `alert`, `confirm`, `prompt` calls | `eslint.config.mjs` |
| `precentor/no-redirect-in-try` | `redirect()` from `next/navigation` inside a `try` block (Next.js 16 swallows the throw) | `tools/eslint-rules/no-redirect-in-try.mjs` |
| `react-hooks/refs` | Writing to `ref.current` during render | Next.js core-web-vitals preset |
| `@typescript-eslint/no-unused-vars` | Unused imports/vars (with `^_` opt-out) | `eslint.config.mjs` |

If you genuinely need to disable one of these rules for a specific line, leave a one-line comment explaining why right above the `eslint-disable` directive. Reviews should reject undocumented disables.
