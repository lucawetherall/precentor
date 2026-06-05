---
description: Make a Drizzle schema change safely — additive-only, then push or defer.
argument-hint: <what to change, e.g. "add nullable notes column to services">
---
Make this schema change: $ARGUMENTS

Follow [`src/lib/db/AGENTS.md`](src/lib/db/AGENTS.md) exactly:

1. Edit the table in `src/lib/db/schema-base.ts` or `schema-liturgy.ts` (or a new `schema-<area>.ts` re-exported from `schema.ts`). Keep all imports pointing at `@/lib/db/schema`. Never touch the `.sql` files in `drizzle/`.
2. If you added a foreign key you'll join on, add the relation in `relations.ts`.
3. Keep it **additive** — new nullable columns, tables, or indexes. If the request is actually a rename, drop, type change, or `NOT NULL`-without-default, **stop and flag it for the user**: production is drifted and still holds legacy data, so destructive changes need a deliberate migration.
4. Apply it:
   - If `DATABASE_URL` is set: run `npx drizzle-kit push` and **inspect the generated SQL before confirming** (watch for partial-index `WHERE` clauses).
   - If it isn't set: append the change to `docs/superpowers/plans/DEFERRED_DB_PUSHES.md` (create it if missing) and note the pending push in your summary.
5. Run `npm run check`.
