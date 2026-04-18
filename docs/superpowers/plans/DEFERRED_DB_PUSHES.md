# Deferred DB pushes

This file tracks schema changes that have been committed in `src/lib/db/schema-base.ts` but not yet pushed to a database. When `DATABASE_URL` is available, run `npx drizzle-kit push` once and delete (or clear) this file.

- Task 1.2 (role_catalog table) — run `npx drizzle-kit push` once DATABASE_URL is configured.
- Task 1.3 (church_member_roles, church_service_presets, preset_role_slots, service_role_slots tables) — run `npx drizzle-kit push` once DATABASE_URL is configured. Verify the generated SQL for `preset_name_unique` includes `WHERE archived_at IS NULL` (partial unique index).
- Task 1.4 (nullable presetId on churchServicePatterns & services; nullable catalogRoleId + quarantinedAt on rotaEntries; partial index `rota_service_active_idx`) — run `npx drizzle-kit push` once DATABASE_URL is configured.
- Task 1.5 (migration_phase_state, migration_audit_log, quarantined_rota_entries tables + migration_severity enum) — run `npx drizzle-kit push` once DATABASE_URL is configured.
