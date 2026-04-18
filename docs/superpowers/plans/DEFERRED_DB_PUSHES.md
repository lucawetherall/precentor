# Deferred DB pushes

This file tracks schema changes that have been committed in `src/lib/db/schema-base.ts` but not yet pushed to a database.

When `DATABASE_URL` is configured, run `npx drizzle-kit push` **once** to apply ALL deferred tasks (1.2 through 1.5) together. A single push against HEAD will apply every deferred schema change below in one go — the pushes are not per-task. After pushing, verify that the partial unique index `preset_name_unique` landed with the `WHERE archived_at IS NULL` clause (e.g. via `\d+ church_service_presets` in psql, or by inspecting the generated SQL before confirming the push).

Once successfully pushed, delete this file.

Deferred changes included in the single push:

- Task 1.2 — role_catalog table.
- Task 1.3 — church_member_roles, church_service_presets, preset_role_slots, service_role_slots tables. The partial unique index `preset_name_unique` must include `WHERE archived_at IS NULL`.
- Task 1.4 — nullable presetId on churchServicePatterns & services; nullable catalogRoleId + quarantinedAt on rotaEntries; partial index `rota_service_active_idx`.
- Task 1.5 — migration_phase_state, migration_audit_log, quarantined_rota_entries tables + migration_phase and migration_severity enums.
