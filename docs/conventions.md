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

## Lint rules summary

| Rule | What it catches | Where defined |
|------|-----------------|---------------|
| `no-restricted-globals` | `alert`, `confirm`, `prompt` calls | `eslint.config.mjs` |
| `precentor/no-redirect-in-try` | `redirect()` from `next/navigation` inside a `try` block (Next.js 16 swallows the throw) | `tools/eslint-rules/no-redirect-in-try.js` |
| `react-hooks/refs` | Writing to `ref.current` during render | Next.js core-web-vitals preset |
| `@typescript-eslint/no-unused-vars` | Unused imports/vars (with `^_` opt-out) | `eslint.config.mjs` |

If you genuinely need to disable one of these rules for a specific line, leave a one-line comment explaining why right above the `eslint-disable` directive. Reviews should reject undocumented disables.
