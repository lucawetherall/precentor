# Drizzle migrations

## State of this folder

There are six `0000_*.sql` files and no `meta/_journal.json`. This folder is
**not a clean, replayable migration chain** — it is a pile of snapshots
produced by re-running `drizzle-kit generate` against an empty journal during
development.

Production deploys to date have been performed via `drizzle-kit push`, which
diffs `src/lib/db/schema.ts` directly against the live database and ignores
the SQL files here. That is why the app works despite the chaos in this
directory.

`0005_integrity_indexes.sql` is the only file intended to be applied as a
standalone patch to an existing production database — it is idempotent and
wrapped in `IF NOT EXISTS` guards.

## Before first public release

Do this once, on a maintenance window, so future migrations are replayable:

1. Verify the production schema matches `src/lib/db/schema.ts` exactly.
2. Apply `0005_integrity_indexes.sql` manually:
   `psql "$DATABASE_URL" -f drizzle/0005_integrity_indexes.sql`
3. Delete all `0000_*.sql`, `0001_*.sql` … `0005_*.sql` files.
4. Re-run `drizzle-kit generate` to produce a single baseline `0000_*.sql`
   matching the current schema, and commit the generated `meta/_journal.json`.
5. Mark the new baseline as already-applied in production by inserting a row
   into the `__drizzle_migrations` table (Drizzle creates this on first run).
6. Switch deploys from `drizzle-kit push` to `drizzle-kit migrate` so
   migrations are recorded.

Until step 6 is done, schema drift is possible — any column added directly in
Supabase Studio will not appear in either the schema file or the migrations.
