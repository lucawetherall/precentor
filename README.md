# Precentor

A planning tool for church musicians — manage services, the lectionary, music and
hymn selection, and rotas, and generate printable service sheets.

**Stack:** Next.js 16 (App Router) · React 19 · Drizzle ORM (Postgres via Supabase) ·
Tailwind 4 · Zod · Vitest + Playwright.

> **Working in this repo with an AI agent?** Start with [`AGENTS.md`](AGENTS.md) and
> [`docs/conventions.md`](docs/conventions.md) — they cover the project map, commands,
> and the conventions CI enforces.

## Getting started

Requires **Node 24** and **npm** (the repo ships a `package-lock.json`; don't use
yarn/pnpm/bun).

```bash
npm ci                 # install
cp .env.example .env    # then fill in the values (Supabase, Resend, Gemini…)
npm run dev             # http://localhost:3000
```

Pages live under `src/app`; start at `src/app/(app)`.

## Common commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| **Verify (lint + typecheck + unit tests)** | `npm run check` |
| Unit tests (watch) | `npm run test:watch` |
| E2E tests | `npm run test:e2e` |
| Production build | `npm run build` |
| Apply schema changes to the DB | `npx drizzle-kit push` (see [`src/lib/db/AGENTS.md`](src/lib/db/AGENTS.md)) |
| Seed data | `npm run db:seed*` (see `package.json`) |

Run `npm run check` before opening a PR — CI runs the same checks plus the build and
E2E suite.

## Documentation

- [`AGENTS.md`](AGENTS.md) — orientation for contributors and AI agents
- [`docs/conventions.md`](docs/conventions.md) — checklists for pages, routes, dialogs, DB changes
- [`docs/glossary.md`](docs/glossary.md) — liturgical and musical vocabulary
- [`docs/superpowers/`](docs/superpowers/) — historical specs and plans
