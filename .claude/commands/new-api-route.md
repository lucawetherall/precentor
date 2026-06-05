---
description: Scaffold a new API route handler following project conventions.
argument-hint: <method + path, e.g. "POST churches/[churchId]/notes">
---
Create the API route: $ARGUMENTS

Follow the "New API route" checklist in [`docs/conventions.md`](docs/conventions.md):

- Put the file at `src/app/api/.../route.ts` and export the HTTP-method handler.
- Authenticate with `requireChurchRole(churchId, role)` or `requireAuth()` from `@/lib/auth/permissions`. Cron/webhook routes that have no session use bearer-token comparison via `timingSafeEqual` (see `api/cron/log-performances/route.ts`).
- Parse any request body with `parseJsonBody(req, schema)` from `@/lib/api/parse-body` and a Zod schema — never `await req.json()` directly.
- Return the right status codes (400 validation · 401 no auth · 403 wrong role · 404 missing · 409 conflict · 500 unexpected). Build error responses with `apiError` from `@/lib/api-helpers`.
- Log unexpected errors with `logger` from `@/lib/logger`, not `console.error`.
- Add a test in the colocated `__tests__/` folder.
- Run `npm run check`.
