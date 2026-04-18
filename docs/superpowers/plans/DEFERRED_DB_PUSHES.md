# Deferred DB pushes

This file tracks schema changes that have been committed in `src/lib/db/schema-base.ts` but not yet pushed to a database. When `DATABASE_URL` is available, run `npx drizzle-kit push` once and delete (or clear) this file.

- Task 1.2 (role_catalog table) — run `npx drizzle-kit push` once DATABASE_URL is configured.
