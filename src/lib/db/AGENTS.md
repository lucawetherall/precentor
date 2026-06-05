# Database rules

The schema is **TypeScript-first**. `npx drizzle-kit push` against the live database
is the deploy mechanism. The `.sql` files in `drizzle/` are historical snapshots,
**not** the source of truth — never hand-author or edit them.

## Editing the schema

- Core tables/enums live in `schema-base.ts`; liturgy/template tables live in
  `schema-liturgy.ts`. Add a new table to the matching file, or create a new
  `schema-<area>.ts` and re-export it from `schema.ts`.
- **Always import from `@/lib/db/schema`** (the re-export barrel), never from
  `schema-base` / `schema-liturgy` directly. That keeps callsites stable if a table
  moves between files.
- Add relations in `relations.ts` when you introduce a foreign key you'll join on.
- Access the database through the `db` proxy from `@/lib/db` (server-only, lazily
  connected). Don't construct a `postgres()` client yourself.

## Applying changes — production is drifted, so changes are additive-only

The live database is **behind** the committed schema and still holds legacy data.
Treat every change as **additive**:

- ✅ Safe to push: new **nullable** columns, new tables, new indexes.
- ⛔ Do **not** push blind: renames, drops, type changes, or `NOT NULL` without a
  default. These can break the live app or lose data. Flag them for a human and
  describe the migration path instead.

## Pushing vs. deferring

`drizzle-kit push` needs `DATABASE_URL`. If it isn't set in your environment, **do not
block your task** — record the change so a human can apply it:

1. Append the change to `docs/superpowers/plans/DEFERRED_DB_PUSHES.md` (create the file
   if it no longer exists — it's deleted once everything has been pushed).
2. Note in your summary that a DB push is pending.

When you do push, **inspect the generated SQL before confirming** — partial indexes
(`WHERE … IS NULL`) and other qualifiers are easy to drop silently.
