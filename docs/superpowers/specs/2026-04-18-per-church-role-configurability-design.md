# Per-Church Configurability for Service Templates and Voice/Role Types

**Status:** Draft for review
**Date:** 2026-04-18
**Author:** Luca Wetherall (design brainstorm with AI)
**Related:** Primary feature request 2026-04-18 — Per-Church Configurability

## 1. Problem

Precentor currently hardcodes a single musical model: every member has exactly one SATB voice part, every service implicitly needs a full SATB choir, there is no concept of an Organist or Director as a distinct rota role, and every church is a single-service institution as far as default times are concerned. This does not match reality:

- Churches run multiple regular services (e.g. 8am said Eucharist, 10.30am sung Eucharist, 6pm Evensong), each with different times, musical forces, and personnel requirements.
- Not every service needs a choir; some need only an organist; some are fully said.
- The person conducting a service ("Director" on the rota) is not necessarily the institutional Director of Music (DoM) of the church, but in the current data model there is nowhere to record either.
- A single user is frequently a singer *and* an organist *and* the DoM, but today can only be recorded as one of those things.

This design introduces a configurable role catalog, multi-role user membership, per-church service presets, and the supporting UI and migration work. Existing rotas and availability data are preserved.

## 2. Goals

1. Admins can configure recurring service schedules with per-preset default times, role requirements, and music-list expectations, without developer intervention.
2. The rota model supports Organist and Director as distinct non-singer slots, alongside any number of other rota-eligible roles from a global catalog.
3. A user can hold multiple roles simultaneously in a single church (e.g. Bass + Organist + Curate) and submit availability only for services whose active slots they are eligible to fill.
4. The system distinguishes cleanly between "role slot unfilled" (a problem) and "role slot not required" (a valid configuration).
5. Existing churches, rotas, and availability data migrate automatically to the equivalent configurable setup with no admin action required and no loss of data.

## 3. Non-goals (deferred to later phases)

The following were considered and explicitly deferred:

- **Voice subdivisions** (SSAATTBB with S1/S2, T1/T2 as first-class).
- **Non-SATB choral structures** (SSAA, TTBB, unison upper-voice / children's choirs).
- **Minimum choir-size publish gates** (e.g. "at least 2 of each voice part before publish").
- **Deputy / dep systems** with approved dep lists.
- **Stipend and fee tracking** per role per service.
- **Rehearsal scheduling** as a separate entity with its own availability/attendance.
- **Institutional-history tracking** (former DoMs, date ranges). Appointments are current-state only.
- **Per-service liturgical servers** (Crucifer, Thurifer, Acolyte, Server, etc.). The catalog contains only Deacon and Subdeacon as the minimum viable sung-liturgy attribution. Full server catalogs come later.
- **Honorifics and styles** ("The Revd", "The Very Revd") as catalog entities. Derived at display time where needed.

## 4. Decisions carried forward from brainstorm

The following decisions were settled before design drafting:

- **Role taxonomy:** global catalog with per-church enable/override (single unified table; one `category` enum; `rotaEligible` and `institutional` flags).
- **User-to-roles mapping:** many-to-many join table. `churchMemberships.voicePart` retired after backfill.
- **Preset architecture:** a new `church_service_presets` entity bundles name + service type + default time + choir requirement + role slots + music-list field set. Patterns reference presets; services snapshot presets at creation.
- **Snapshot pattern:** per-service role slots are copied from the preset at service creation. Editing a preset does not mutate historical services.
- **Time defaults:** default time lives on the preset. Patterns inherit. If a church wants the same preset at a different time on a different day, they create a new preset.
- **Exclusivity:** app-level validation. Dual-role assignments on the same service (Director + voice, Organist + voice, Director + Organist, etc.) are all permitted but surface a soft warning in the UI. Organist-slot cardinality is exactly one person per service (at most one rota entry per Organist slot), enforced by the slot's `exclusive=true` flag; this is different from the dual-role warning and remains a hard constraint.
- **Institutional metadata:** stored in `church_member_roles` on rows whose catalog role has `institutional=true`. No separate appointments table.

## 5. Role catalog (seeded)

The catalog is a fixed global table seeded via migration. New roles are added by future seed migrations, not by admin UI in v1.

| Category | Role | R | I |
|---|---|---|---|
| VOICE | Soprano | ✓ | |
| VOICE | Alto | ✓ | |
| VOICE | Tenor | ✓ | |
| VOICE | Bass | ✓ | |
| MUSIC_DIRECTION | Director | ✓ | |
| MUSIC_DIRECTION | Assistant Director | ✓ | |
| MUSIC_DIRECTION | Director of Music | | ✓ |
| MUSIC_DIRECTION | Assistant Director of Music | | ✓ |
| MUSIC_INSTRUMENT | Organist | ✓ | |
| MUSIC_INSTRUMENT | Assistant Organist | ✓ | |
| MUSIC_INSTRUMENT | Sub-Organist | ✓ | ✓ |
| MUSIC_INSTRUMENT | Deputy Organist | ✓ | |
| MUSIC_INSTRUMENT | Organ Scholar | ✓ | ✓ |
| MUSIC_INSTRUMENT | Instrumentalist | ✓ | |
| CLERGY_PARISH | Vicar | | ✓ |
| CLERGY_PARISH | Rector | | ✓ |
| CLERGY_PARISH | Priest-in-Charge | | ✓ |
| CLERGY_PARISH | Associate Vicar | | ✓ |
| CLERGY_PARISH | Curate | | ✓ |
| CLERGY_PARISH | Deacon | ✓ | ✓ |
| CLERGY_PARISH | Subdeacon | ✓ | ✓ |
| CLERGY_CATHEDRAL | Bishop | | ✓ |
| CLERGY_CATHEDRAL | Archbishop | | ✓ |
| CLERGY_CATHEDRAL | Dean | | ✓ |
| CLERGY_CATHEDRAL | Sub-Dean | | ✓ |
| CLERGY_CATHEDRAL | Provost | | ✓ |
| CLERGY_CATHEDRAL | Archdeacon | | ✓ |
| CLERGY_CATHEDRAL | Canon Residentiary | | ✓ |
| CLERGY_CATHEDRAL | Canon Precentor | | ✓ |
| CLERGY_CATHEDRAL | Canon Chancellor | | ✓ |
| CLERGY_CATHEDRAL | Canon Treasurer | | ✓ |
| CLERGY_CATHEDRAL | Canon Missioner | | ✓ |
| CLERGY_CATHEDRAL | Honorary Canon | | ✓ |
| CLERGY_CATHEDRAL | Lay Canon | | ✓ |
| CLERGY_CATHEDRAL | Prebendary | | ✓ |
| CLERGY_CATHEDRAL | Succentor | | ✓ |
| LAY_MINISTRY | Licensed Lay Minister (Reader) | ✓ | ✓ |
| LAY_MINISTRY | Lay Pastoral Minister | | ✓ |
| LAY_MINISTRY | Lay Worship Leader | ✓ | |

R = rota-eligible. I = institutional.

## 6. Data model

### 6.1 New: `role_catalog` (global, seeded)

```
id             uuid PK
key            text UNIQUE NOT NULL               -- stable machine identifier, SCREAMING_SNAKE
defaultName    text NOT NULL                      -- display name
category       enum(role_category) NOT NULL       -- VOICE | MUSIC_DIRECTION | MUSIC_INSTRUMENT | CLERGY_PARISH | CLERGY_CATHEDRAL | LAY_MINISTRY
rotaEligible   boolean NOT NULL DEFAULT false
institutional  boolean NOT NULL DEFAULT false
defaultExclusive boolean NOT NULL DEFAULT true    -- is this role a single-person slot by default
defaultMinCount integer NOT NULL DEFAULT 1
defaultMaxCount integer NULL                      -- NULL = unbounded (e.g. voice parts)
displayOrder   integer NOT NULL
createdAt      timestamp DEFAULT now()
```

Constraint: at least one of `rotaEligible` or `institutional` must be true.

**Lifecycle:** catalog rows are permanent in v1. There is no admin-facing archive, rename, or delete. New roles are added only via future seed migrations. `role_catalog.key` is immutable once seeded; `defaultName` may be edited by a seed migration for display-text fixes but not renamed to mean something different. Consumers (preset slots, service slot snapshots, member role assignments) must always reference `id` (FK) and dereference `defaultName` at display time. An `archivedAt` column will be added in a future phase when archival is needed; at that point existing `ON DELETE RESTRICT` FKs will be revisited.

### 6.2 New: `role_catalog_category` enum

```sql
CREATE TYPE role_category AS ENUM (
  'VOICE',
  'MUSIC_DIRECTION',
  'MUSIC_INSTRUMENT',
  'CLERGY_PARISH',
  'CLERGY_CATHEDRAL',
  'LAY_MINISTRY'
);
```

### 6.3 New: `church_member_roles`

Replaces `churchMemberships.voicePart` and also holds institutional appointments.

```
id              uuid PK
userId          uuid FK → users.id           ON DELETE CASCADE
churchId        uuid FK → churches.id        ON DELETE CASCADE
catalogRoleId   uuid FK → role_catalog.id    ON DELETE RESTRICT
isPrimary       boolean NOT NULL DEFAULT false   -- used for display ordering / name badges
displayOrder    integer NOT NULL DEFAULT 0
grantedAt       timestamp DEFAULT now()
UNIQUE(userId, churchId, catalogRoleId)
INDEX(churchId, catalogRoleId)               -- for "find everyone who can fill X"
INDEX(userId, churchId)                       -- for "what roles does this user have"
```

A user with a primary voice (e.g. Bass) who is also the Organist and is also the institutional DoM has three rows here.

App-level invariant: at most one row per `(userId, churchId)` may have `isPrimary=true`. Enforced by API validation; no partial unique index in v1 (adds migration complexity for small payoff).

### 6.4 New: `church_service_presets`

```
id                      uuid PK
churchId                uuid FK → churches.id ON DELETE CASCADE
name                    text NOT NULL                            -- "Sunday Sung Eucharist"
serviceType             enum(service_type) NOT NULL              -- existing enum, unchanged
defaultTime             text NULL                                -- "10:00" — NULL when migration could not infer
choirRequirement        enum(choir_requirement) NOT NULL         -- FULL_CHOIR | ORGANIST_ONLY | SAID
liturgicalTemplateId    uuid FK → church_templates.id NULL ON DELETE SET NULL  -- optional link to existing liturgical structure
musicListFieldSet       enum(music_list_field_set) NOT NULL      -- CHORAL | HYMNS_ONLY | READINGS_ONLY
liturgicalSeasonTags    text[] NOT NULL DEFAULT '{}'             -- secondary item J; tag values are liturgical_season enum members serialised as text (see §6.5.1)
archivedAt              timestamp NULL                           -- soft delete; patterns referencing an archived preset warn
createdAt               timestamp DEFAULT now()
updatedAt               timestamp DEFAULT now()
UNIQUE(churchId, name) WHERE archivedAt IS NULL
INDEX(churchId)
INDEX(churchId, archivedAt)                  -- list-active queries
```

**Archival is one-way in v1** (no unarchive UI). Archived presets remain visible only via direct URL or admin DB access; patterns pointing at an archived preset show a warning in the patterns list. To "restore" an archived preset, an admin clones it under a new name.

**`defaultTime` semantics:** the preset's default time. Patterns that reference the preset inherit it. Patterns do NOT carry their own time override (per §4 decision "Time defaults"). If a church needs the same preset at two different times on different days, they create two presets. NULL is a valid value used by the migration to flag presets where the migration could not safely infer a single time; admins must set it before patterns generate services.

### 6.5 New: `choir_requirement` enum

```sql
CREATE TYPE choir_requirement AS ENUM (
  'FULL_CHOIR',       -- choir plus organist plus director, by default
  'ORGANIST_ONLY',    -- just the organist, no voice parts, no director
  'SAID'              -- no musicians at all
);
```

`choirRequirement` is informational metadata plus a default for which role slots to auto-populate on preset creation. The source of truth for active slots is `preset_role_slots` (v1: derived at creation, then user-editable). **Editing `choirRequirement` on an existing preset does not auto-update its `preset_role_slots`** — the slot table is independent after creation. The admin may use the preset detail page to manually align slots if they change `choirRequirement` later.

### 6.5.1 Reuse of existing `liturgical_season` enum

`liturgicalSeasonTags` (§6.4) holds string-serialised values from the existing `liturgical_season` enum (`ADVENT`, `CHRISTMAS`, `EPIPHANY`, `LENT`, `HOLY_WEEK`, `EASTER`, `ASCENSION`, `PENTECOST`, `TRINITY`, `ORDINARY`, `KINGDOM`). API validation rejects any string not in this set. No new enum required.

### 6.6 New: `music_list_field_set` enum

```sql
CREATE TYPE music_list_field_set AS ENUM (
  'CHORAL',         -- full set: hymns, anthem, setting, psalms, canticles, voluntaries
  'HYMNS_ONLY',     -- hymns + voluntaries; anthem/setting/canticles suppressed
  'READINGS_ONLY'   -- liturgy/collect/readings only, no music fields
);
```

Drives music-list PDF rendering (secondary item I). Determines which field groups are shown in the service editor.

### 6.7 New: `preset_role_slots`

```
id              uuid PK
presetId        uuid FK → church_service_presets.id ON DELETE CASCADE
catalogRoleId   uuid FK → role_catalog.id ON DELETE RESTRICT
minCount        integer NOT NULL DEFAULT 0        -- 0 = optional
maxCount        integer NULL                      -- NULL = unbounded
exclusive       boolean NOT NULL                  -- one person per slot (Director, Organist) vs multiple (voice parts)
displayOrder    integer NOT NULL
UNIQUE(presetId, catalogRoleId)
INDEX(presetId)
CHECK (minCount >= 0)
CHECK (maxCount IS NULL OR maxCount >= minCount)
CHECK (NOT exclusive OR (minCount <= 1 AND (maxCount IS NULL OR maxCount = 1)))
```

Referential rule enforced at app level: `catalogRoleId` must reference a row with `rotaEligible=true`. A SQL trigger is technically possible but kept app-side in v1 to avoid enum-table coupling. A weekly audit query (documented in §16) flags drift.

Voice parts (catalog roles with `category=VOICE`) must have `exclusive=false` — enforced at API layer in the preset-slot create/update endpoint, not in SQL (would require a trigger that joins to `role_catalog`).

A preset with zero `preset_role_slots` rows is valid and means "no rota obligations for this preset" (fully said service).

### 6.8 New: `service_role_slots`

Per-service snapshot of `preset_role_slots`, created when the service is created.

```
id              uuid PK
serviceId       uuid FK → services.id ON DELETE CASCADE
catalogRoleId   uuid FK → role_catalog.id ON DELETE RESTRICT
minCount        integer NOT NULL DEFAULT 0
maxCount        integer NULL
exclusive       boolean NOT NULL
displayOrder    integer NOT NULL
UNIQUE(serviceId, catalogRoleId)
INDEX(serviceId)
CHECK (minCount >= 0)
CHECK (maxCount IS NULL OR maxCount >= minCount)
CHECK (NOT exclusive OR (minCount <= 1 AND (maxCount IS NULL OR maxCount = 1)))
```

Edits to the preset after service creation do not propagate; admins editing this service edit `service_role_slots` directly.

### 6.9 Modified: `church_service_patterns` (existing)

Add:
```
presetId   uuid FK → church_service_presets.id NULL  -- required post-migration
```

Drop after backfill: `serviceType` and `time` only. `enabled` is retained — disabling a pattern without archiving its preset remains meaningful.

New unique constraint (post-Phase-D): `UNIQUE(churchId, dayOfWeek, presetId)`.

### 6.10 Modified: `services` (existing)

Add:
```
presetId   uuid FK → church_service_presets.id NULL  -- nullable; services created before v1 may have no preset
```

Drop after migration: `choirStatus`. Its replacement is:
- The service has `service_role_slots` rows → role-based config applies.
- The service has no rows → no rota obligations.
- The original `choirStatus === 'NO_SERVICE'` special case (historical service skipped) is preserved by **not** creating a service row in the first place during the pattern generator; any existing `NO_SERVICE` rows are archived (status = `ARCHIVED`) during migration rather than migrated.

### 6.11 Modified: `rota_entries` (existing)

Add:
```
catalogRoleId   uuid FK → role_catalog.id NULL       -- nullable during migration, required after
quarantinedAt   timestamp NULL                        -- per §11.4; non-NULL = entry is dormant due to slot removal
```

Backfilled from `churchMemberships.voicePart` during migration. Post-migration, a rota entry represents: "user X fills slot Y on service Z."

New unique constraint: `UNIQUE(serviceId, userId, catalogRoleId) WHERE quarantinedAt IS NULL` replaces `UNIQUE(serviceId, userId)`. The partial index allows a user to retain a quarantined entry for the same `(serviceId, catalogRoleId)` while also holding a fresh active entry, should they be re-added after a slot is restored. New index: `INDEX(serviceId, quarantinedAt) WHERE quarantinedAt IS NULL` for fast active-entries queries.

A separate table `quarantined_rota_entries` (introduced in §7 Phase B step 9) holds entries that were orphaned at migration time (no resolvable role). The two quarantine surfaces are intentionally separate:
- `rota_entries.quarantinedAt` = post-launch slot removal.
- `quarantined_rota_entries` table = legacy migration leftovers.

If at some future point the second surface is empty for all churches, the table can be dropped.

### 6.12 Modified: `availability` (existing)

**No schema change.** Eligibility is computed query-side: a user is eligible to submit availability for a service when at least one `service_role_slots` row has a `catalogRoleId` that matches one of the user's `church_member_roles`. UI behaviour and stale-row handling are specified in §10.

### 6.13 Retired columns

- `churchMemberships.voicePart` — backfilled into `church_member_roles`, then dropped.
- `services.choirStatus` — replaced by presence/absence of `service_role_slots` rows plus preset metadata, then dropped.

## 7. Migration strategy

All migrations are forward-only (Drizzle convention); rollbacks are documented as reverse SQL scripts in `drizzle/rollbacks/` but not wired into the Drizzle CLI.

**Idempotence convention:** every backfill statement uses `INSERT … ON CONFLICT DO NOTHING` or `… ON CONFLICT DO UPDATE WHERE …` so Phase B can be safely re-run if a Phase B transaction is partially rolled back. Phase B is wrapped in a single transaction; if it commits, it is considered complete and is not re-run. A `migration_phase_state` table records which phase has completed for which church.

**Migration audit log:** Phase B writes to a new table `migration_audit_log(id, phase, churchId NULL, severity, code, details JSONB, createdAt)` for any condition requiring admin attention. Severities: `INFO` / `WARN` / `ERROR`. The table persists indefinitely. Admins access it via a new endpoint `GET /api/admin/migration-log` (super-admin only) and via a banner on each affected church's dashboard until the relevant `code` values are dismissed.

### Phase A — Additive schema

Migration `0008_role_catalog_and_presets_schema.sql`:

1. Create enums: `role_category`, `choir_requirement`, `music_list_field_set`.
2. Create tables: `role_catalog`, `church_member_roles`, `church_service_presets`, `preset_role_slots`, `service_role_slots`.
3. Add nullable columns: `church_service_patterns.presetId`, `services.presetId`, `rota_entries.catalogRoleId`.
4. Seed `role_catalog` with the full catalog from §5.

No existing data is touched in this phase. Code continues to read from `voicePart`, `choirStatus`, etc.

### Phase B — Data backfill

Migration `0009_backfill_roles_and_presets.sql` (single transaction; idempotent within a single execution; not re-run after commit per `migration_phase_state`):

1. **Backfill `church_member_roles` from `voicePart`.** For every `churchMemberships` row with `voicePart IS NOT NULL`, insert a row with `(userId, churchId, catalogRoleId = lookup voicePart, isPrimary=true, displayOrder=0)` using `ON CONFLICT (userId, churchId, catalogRoleId) DO NOTHING`. Members with `voicePart=NULL` get no row in this step (they have no roles until an admin assigns one); log `INFO` per member to `migration_audit_log` with code `MEMBER_NO_VOICE_PART`.

2. **Generate default presets per church.** For every church, create three presets via `INSERT … ON CONFLICT (churchId, name) WHERE archivedAt IS NULL DO NOTHING`:
   - `Default Choral` — `serviceType = SUNG_EUCHARIST`, `choirRequirement = FULL_CHOIR`, `musicListFieldSet = CHORAL`. `defaultTime` resolved per step 4.
   - `Organist-only Eucharist` — `serviceType = SAID_EUCHARIST`, `choirRequirement = ORGANIST_ONLY`, `musicListFieldSet = HYMNS_ONLY`, `defaultTime = NULL`.
   - `Said Eucharist` — `serviceType = SAID_EUCHARIST`, `choirRequirement = SAID`, `musicListFieldSet = READINGS_ONLY`, `defaultTime = NULL`.

3. **Populate `preset_role_slots` for defaults.** Same `ON CONFLICT DO NOTHING` pattern.
   - Choral preset: S/A/T/B each with `minCount=1, maxCount=NULL, exclusive=false`, plus Organist (`min=1, max=1, exclusive=true`) and Director (`min=1, max=1, exclusive=true`).
   - Organist-only: Organist only (`min=1, max=1, exclusive=true`).
   - Said: no rows.

4. **Map existing `church_service_patterns` to presets and resolve preset `defaultTime`.** For each church:
   - For each pattern, derive a target preset by `serviceType`:
     - `SUNG_EUCHARIST`, `CHORAL_EVENSONG`, `CHORAL_MATINS`, `COMPLINE`, `FAMILY_SERVICE`, `CUSTOM` → `Default Choral`.
     - `SAID_EUCHARIST` → `Said Eucharist`.
   - Set the pattern's `presetId` to the target preset.
   - For each church-and-target-preset pair, examine the distinct set of `time` values across mapped patterns:
     - If exactly one distinct time → set the preset's `defaultTime` to that value.
     - If two or more distinct times → leave `defaultTime` NULL and write `WARN` row to `migration_audit_log` with code `PRESET_TIME_AMBIGUOUS`, payload `{presetId, churchId, observedTimes: [...]}`. The admin must either set a `defaultTime` for one preset and create additional presets for the other times, or split the patterns across new presets.

5. **Map existing `services` to presets.** For each `services` row, set `presetId` using the same `serviceType → preset` table as step 4. If the service has `choirStatus IN ('NO_CHOIR_NEEDED', 'SAID_SERVICE_ONLY')` and the resolved preset would be the church's `Default Choral`, override the mapping to `Organist-only Eucharist` (for `NO_CHOIR_NEEDED`) or `Said Eucharist` (for `SAID_SERVICE_ONLY`). This preserves the historical intent.

6. **Create `service_role_slots` for existing services** by copying from the resolved preset's `preset_role_slots`. Existing rows are skipped via `ON CONFLICT (serviceId, catalogRoleId) DO NOTHING`. The mapping in step 5 ensures that:
   - Services that were `CHOIR_REQUIRED` get the full SATB + Organist + Director slots.
   - Services that were `NO_CHOIR_NEEDED` get only the Organist slot.
   - Services that were `SAID_SERVICE_ONLY` get no slots.
   - Services that were `NO_SERVICE` are handled in step 8.

7. **Backfill `rota_entries.catalogRoleId`.** For each entry, look up the user's `church_member_roles` rows in this church and choose the row whose catalog role has `category=VOICE` (singer's voice part). If exactly one is found, set it. If zero or multiple are found, leave `catalogRoleId` NULL and write `WARN` row to `migration_audit_log` with code `ROTA_ENTRY_UNCLASSIFIED`, payload `{rotaEntryId, userId, serviceId}`. These rows are quarantined (see step 9).

8. **Archive `choirStatus = 'NO_SERVICE'` services.** Set `services.status = 'ARCHIVED'`. Their `presetId` remains NULL; Phase D step 2 explicitly excludes ARCHIVED services from the NOT NULL constraint.

9. **Quarantine orphaned rota entries.** Move `rota_entries` rows with `catalogRoleId IS NULL` after step 7 into a new table `quarantined_rota_entries` (same shape as `rota_entries` plus a `quarantineReason` text column populated with the audit-log code). Delete them from `rota_entries`. This unblocks Phase D's NOT NULL constraint without losing data; admins triaging the migration log can manually reinstate entries from the quarantine table by assigning a role and re-creating the rota entry.

10. **Record phase completion.** Insert into `migration_phase_state(phase='B', completedAt=now())`. Phase B exits.

### Phase C — Code cutover

Application code is updated to read from and write to the new tables exclusively. The legacy columns (`voicePart`, `choirStatus`, pattern `serviceType`/`time`) remain populated until Phase D drops them; old code paths are not removed during Phase C — they are gated behind a feature flag `useRoleSlotsModel` (default `true` in production after rollout).

**Cutover order** — endpoints flip in this sequence to limit blast radius:
1. **Read-only views first.** Music-list PDF and the rota grid read from new tables. Writes still target both old and new (dual-write) for one week.
2. **Member roles management.** `/members` UI and APIs flip to read/write new tables; legacy `voicePart` column receives writes via a shim that mirrors the user's primary voice role.
3. **Preset and pattern admin UI.** New `/settings/service-presets` ships; `/settings/service-patterns` rewires to use presets.
4. **Service creation, rota entries, availability.** These flip last, because they touch the most data.
5. **End of Phase C: dual-write shim removed.** Legacy columns remain readable for one further week as a rollback safety net before Phase D drops them.

**Rollback during Phase C:** if a critical bug is found, set `useRoleSlotsModel=false` to fall back to legacy reads/writes. The dual-write shim ensures the legacy columns remain authoritative during this window.

**Phase C entry gate:** Phase B must have completed without any `ERROR`-severity rows in `migration_audit_log` for the affected churches. `WARN` rows do not block but are surfaced to the admin via banners.

This phase is code-only; no SQL migrations.

### Phase D — Constraint tightening and drops

Migration `0010_drop_legacy_role_columns.sql`. Entry gate: Phase C feature-flag has been at `true` in production for at least one week with no rollbacks; `migration_audit_log` is fully triaged (no untriaged `WARN` or `ERROR` rows).

1. **Patterns:** drop `UNIQUE(churchId, dayOfWeek, serviceType)`; add `UNIQUE(churchId, dayOfWeek, presetId)`; set `church_service_patterns.presetId` NOT NULL; drop `serviceType` and `time` columns.
2. **Services:** add partial constraint `CHECK (status = 'ARCHIVED' OR presetId IS NOT NULL)`; drop `choirStatus`. Active queries (status DRAFT or PUBLISHED) must henceforth filter via `presetId IS NOT NULL` or `status != 'ARCHIVED'`.
3. **Rota entries:** drop `UNIQUE(serviceId, userId)`; add `UNIQUE(serviceId, userId, catalogRoleId)`; set `rota_entries.catalogRoleId` NOT NULL. The Phase B step-9 quarantine guarantees no NULL rows remain.
4. **Memberships:** drop `churchMemberships.voicePart`.
5. Drop the legacy `voice_part` enum if no remaining references.

**Reversibility:**
- Phases A, C, D are reversible: A drops new tables/columns; C is code rollback (feature flag); D restores dropped columns by re-deriving from new tables (script in `drizzle/rollbacks/0010_reverse.sql`).
- Phase B is **partially reversible**: deletes from new tables and clearing of new columns can be scripted, but pattern→preset mapping decisions cannot be perfectly undone (the original ambiguous `defaultTime` cases were resolved by admin action that may have written to new tables). The rollback script restores legacy values from new-table state where possible and writes a `WARN` log otherwise. Treat Phase B reversal as a recovery-of-last-resort, not a routine operation. Once Phase D has run, Phase B reversal additionally requires running Phase D reversal first.
- Operational guidance: maintain `migration_phase_state` and the `quarantined_rota_entries` table indefinitely. Both are tiny and provide audit trail for any future questions about the migration outcome.

## 8. API surface changes

### 8.1 New endpoints

All authenticated; auth tier in parens.

```
GET    /api/churches/[churchId]/presets                 (MEMBER) list presets, query: ?includeArchived=false
POST   /api/churches/[churchId]/presets                 (ADMIN)  create preset; body { name, serviceType, defaultTime?, choirRequirement, musicListFieldSet, liturgicalSeasonTags?, liturgicalTemplateId? }
GET    /api/churches/[churchId]/presets/[presetId]      (MEMBER) fetch preset with slots
PATCH  /api/churches/[churchId]/presets/[presetId]      (ADMIN)  update preset metadata; partial body
POST   /api/churches/[churchId]/presets/[presetId]/archive (ADMIN) sets archivedAt; idempotent
DELETE /api/churches/[churchId]/presets/[presetId]      (ADMIN)  hard-delete only when zero referencing patterns AND zero referencing services; otherwise 409 with explanation directing to archive

POST   /api/churches/[churchId]/presets/[presetId]/slots          (ADMIN) body { catalogRoleId, minCount, maxCount?, exclusive, displayOrder }
PATCH  /api/churches/[churchId]/presets/[presetId]/slots/[slotId] (ADMIN) partial body
DELETE /api/churches/[churchId]/presets/[presetId]/slots/[slotId] (ADMIN)

GET    /api/role-catalog                                 (MEMBER) list global catalog
GET    /api/churches/[churchId]/roles                   (MEMBER) list catalog with per-church member-count for each role; query ?rotaEligible=true to filter

POST   /api/churches/[churchId]/members/[memberId]/roles        (ADMIN) body { catalogRoleId, isPrimary? } — returns full assignment row with id
PATCH  /api/churches/[churchId]/members/[memberId]/roles/[id]   (ADMIN) update isPrimary or displayOrder
DELETE /api/churches/[churchId]/members/[memberId]/roles/[id]   (ADMIN)

GET    /api/churches/[churchId]/services/[serviceId]/slots      (MEMBER) returns service_role_slots snapshot
POST   /api/churches/[churchId]/services/[serviceId]/slots      (EDITOR) per-service slot add (override)
PATCH  /api/churches/[churchId]/services/[serviceId]/slots/[id] (EDITOR) per-service slot edit
DELETE /api/churches/[churchId]/services/[serviceId]/slots/[id] (EDITOR) per-service slot remove
POST   /api/churches/[churchId]/services/[serviceId]/slots/restore (EDITOR) reset slots to current preset's slots; existing rota entries for now-removed slots move to a per-service quarantine_holding column for admin reinstatement (see §11.1)

GET    /api/admin/migration-log                          (SUPERADMIN) all entries, query: ?phase=B&churchId=&severity=&code=
POST   /api/admin/migration-log/[id]/dismiss             (SUPERADMIN) marks an entry triaged
```

### 8.2 Modified endpoints

- `POST /api/churches/[churchId]/services` — accepts `presetId`; server snapshots `preset_role_slots` into `service_role_slots`. The existing auto-template-resolution (liturgical structure) continues, pointed at the preset's `liturgicalTemplateId`.
- `POST /api/churches/[churchId]/rota` — accepts `catalogRoleId`; validates: (a) user has that role via `church_member_roles`; (b) service has that slot via `service_role_slots`; (c) exclusivity constraints satisfied; (d) non-hard-blocked dual-role warnings returned in response body.
- `POST /api/churches/[churchId]/availability` — unchanged in shape, but server rejects submissions for services where the user has no eligible role.
- `PATCH /api/churches/[churchId]/members/[memberId]` — `voicePart` body field deprecated; writes a `church_member_roles` row if sent (for API clients not yet updated). Remove support in a follow-up after N weeks.

### 8.3 Validation rules and response shapes

**Standard envelopes:**

```jsonc
// Success without warnings
HTTP 200 / 201
{ "success": true, "data": <resource> }

// Success with non-blocking warnings
HTTP 200 / 201
{ "success": true, "data": <resource>, "warnings": [{"code": "DUAL_ROLE", "message": "…", "context": {…}}] }

// Validation failure
HTTP 400 (general) | 403 (auth) | 404 (missing) | 409 (conflict / exclusive slot)
{ "success": false, "error": {"code": "SLOT_NOT_ON_SERVICE", "message": "…", "field": "catalogRoleId"} }
```

The error envelope follows the existing `src/lib/api-helpers.ts` pattern (see commit `983ccef`); new `code` constants extend the existing list.

**Preset slot validation (POST/PATCH):**
- `catalogRoleId` must reference a row with `rotaEligible=true`. Else 400 `ROLE_NOT_ROTA_ELIGIBLE`.
- `category=VOICE` roles must have `exclusive=false`. Else 400 `VOICE_PART_CANNOT_BE_EXCLUSIVE`.
- DB CHECK constraints (§6.7) handle min/max/exclusive math; surface those errors as 400 `INVALID_SLOT_CARDINALITY`.

**Rota entry validation (POST):**
- The assigned user must hold `catalogRoleId` in `church_member_roles` for this church. Else 403 `USER_LACKS_ROLE`.
- The service must have a row in `service_role_slots` for this `catalogRoleId`. Else 404 `SLOT_NOT_ON_SERVICE`.
- If the slot has `exclusive=true` and a rota entry already exists for `(serviceId, catalogRoleId)`, reject with 409 `SLOT_ALREADY_FILLED`. (Governs "only one Organist per service," etc.)
- If `maxCount` is set and the new entry would push the count past `maxCount`, reject with 409 `SLOT_AT_CAPACITY`.
- Dual-role warning: if, after the new entry is inserted, the user holds two or more rota entries on this service, return success with `warnings: [{code: "DUAL_ROLE", context: {userId, serviceId, allHeldSlots: [{catalogRoleId, slotName}, ...]}}]`. The `allHeldSlots` array always lists every slot the user holds on the service post-insert, so a third or fourth role assignment continues to surface one warning per call with the full slot list. Single voice-part with two assignments by *different* singers is permitted with no warning; a single user holding two voice-part rows on the same service is permitted with a DUAL_ROLE warning.

**Availability validation (POST):**
- The service must have at least one `service_role_slots` row whose `catalogRoleId` is held by the submitting user in `church_member_roles`. Else 403 `NO_ELIGIBLE_ROLE`. (Said services with zero slots always return 403; users with no roles always return 403.)
- Optional slots (`minCount=0`) still count as eligible — the user can submit availability for any slot they could fill.

**Member role assignment validation (POST):**
- Setting `isPrimary=true` clears the flag from any existing primary row for the same `(userId, churchId)` (atomic; no constraint violation).

## 9. UI changes

The app is Next.js 16 App Router with native forms + Zod, tailwind shadcn-style components. All UI additions follow the existing patterns.

### 9.1 New pages

- **`/churches/[churchId]/settings/service-presets`** — list of active presets (archived hidden behind a toggle). Per-row actions: edit, duplicate, archive. Top action: "Create preset." The existing `/settings/service-patterns` page is updated to select from these presets in a dropdown instead of carrying its own serviceType+time fields.

- **`/churches/[churchId]/settings/service-presets/[presetId]`** — preset detail page. Three sections:
  - **Basic** — name, service type, default time, choir requirement, music-list field set.
  - **Role slots** — table of slots (one per catalog role) with editable min/max/exclusive flags. "Add slot" opens a role-picker filtered to `rotaEligible=true` catalog roles not already on this preset. Voice-part slots have the exclusive toggle disabled (greyed) per §8.3 validation.
  - **Advanced (collapsed by default)** — liturgical season tags, liturgical template selector. Future per-preset config additions go here.

- **`/churches/[churchId]/settings/institution`** — institutional metadata. Layout is a two-column page:
  - **Left:** category groups (`CLERGY_PARISH`, `CLERGY_CATHEDRAL`, `MUSIC_DIRECTION` institutional roles, `LAY_MINISTRY` institutional roles). Each group is a collapsible section.
  - **Right (per group):** list of catalog roles with `institutional=true` for that category. Each row is collapsed-by-default and shows the role name plus a "+ Assign" button or a chip with the assigned member's name.
  - A church only ever sees the catalog roles relevant to its category profile (a parish church doesn't see "Canon Residentiary" by default; the `CLERGY_CATHEDRAL` group is collapsed and labelled "Cathedral roles — typically not used in parishes"). All groups are expandable.
  - Multiple appointees are permitted per role (e.g. multiple Canons Residentiary). UI uses tag-style chips; each chip is removable.
  - Mobile: groups stack vertically; each row stays single-column.

### 9.2 Modified pages

- **`/churches/[churchId]/rota`** — the grid is restructured to **one row per (member, primary role)**, with a role pill on each member name. Members with multiple roles appear once with all role pills shown; clicking a pill toggles which role's rota cells are highlighted/editable. A "View by role" toggle (off by default) re-groups the grid into role-grouped sections (Soprano section, then Alto, then Organist, then Director, etc.) for users who prefer the previous mental model. In role-grouped mode, a member with multiple roles appears in each relevant section, with a small badge ("also Director") on each appearance. This avoids the 30-members × 8-roles row explosion in the default view while still supporting role-grouped review. Exclusivity and dual-role warnings surface as inline toast banners on the affected cell. Services whose `service_role_slots` is empty render a collapsed "no rota required" row with no editable cells.

- **`/churches/[churchId]/services`** — service creation form adds a "preset" dropdown (required); the form's `serviceType`, `time`, and `choirRequirement` fields are derived from the selected preset and shown as read-only secondary text. A power-user "override" toggle lets admins detach a service from its preset link (sets `presetId = NULL`) and edit the legacy fields directly — discouraged but supported for one-off special services.

- **`/churches/[churchId]/members`** — the voice-part dropdown is replaced by a multi-role chooser. UI: chip-style display of current roles + an "Add role" button that opens a category-grouped role picker. Primary role is selected via a radio next to each chip. Role picker is filtered by member-side relevance (rota-eligible roles surface first; institutional roles in a secondary tab).

- **`/churches/[churchId]/services/[date]`** — service detail page shows the snapshotted `service_role_slots` and allows per-service overrides. **Override semantics:**
  - Edit a slot's `minCount`, `maxCount`, or `exclusive` flag (most common case: "this Sunday we need 2 Tenors minimum").
  - Add a new slot from the catalog (e.g. add an Instrumentalist for a special feast).
  - Remove a slot (e.g. "no Director this Sunday — DoM is sick and we're singing unison hymns").
  - **Removing a slot with existing rota entries:** entries for the removed slot are not deleted. They move to a per-service `quarantined_slot_entries` view (rendered as a collapsed "Previously rotaed (slot removed)" panel) so the admin can decide to (a) reassign those people to a different slot, or (b) acknowledge and dismiss.
  - "Restore from preset" button: replaces all `service_role_slots` rows with a fresh copy from the current preset. Custom slots added via override are removed; quarantined entries from the previous override remain in the per-service quarantine panel.

- **Music list PDF** (`/churches/[churchId]/music-list`) — honours `preset.musicListFieldSet` per service:
  - `CHORAL` — current full set (hymns, anthems, mass settings, canticles, responses, voluntaries).
  - `HYMNS_ONLY` — hymns and voluntaries only; anthem / mass setting / canticle / responses suppressed.
  - `READINGS_ONLY` — collect, readings, and liturgical text shown; all music slots suppressed.
  - Replaces the existing `choirStatus`-based suppression in `build-music-list-data.ts`. The "Choir not needed" string in the PDF is repurposed as a per-section header where applicable.

### 9.3 Onboarding / first-run

A new church sees three presets seeded automatically (`Default Choral`, `Organist-only Eucharist`, `Said Eucharist`) matching the migration behaviour. The Advanced panel on the presets page hosts less-common config (season tags, music-list field set when deviating from the choirRequirement default).

### 9.4 Migration UX for existing churches

After Phase B + Phase C ships, the first time an existing church admin loads any page in their church, they see a **persistent banner** at the top of every page until dismissed:

> **We've upgraded how Precentor handles services and roles.** Three service presets have been created automatically based on your existing setup. [Review presets] [What's new] [Dismiss]

The "[Review presets]" link goes to `/settings/service-presets`. The "[What's new]" link opens a short modal with a 5-item summary (presets, role catalog, multi-role members, dual-role warnings, music-list field sets).

**If the church has any `migration_audit_log` rows of severity `WARN` or `ERROR`,** the banner is amber/red instead of blue and adds a "[Migration issues need your attention]" link going to a new `/settings/migration-issues` page that lists the entries with explanations and remediation steps:

| Code | Plain-English explanation | Remediation link |
|---|---|---|
| `MEMBER_NO_VOICE_PART` | "X members had no voice part assigned. They have no roles in the new system." | "[Assign roles]" → `/members` |
| `PRESET_TIME_AMBIGUOUS` | "Your X service uses different times on different days. We couldn't pick one default time." | "[Set times]" → `/settings/service-presets` |
| `ROTA_ENTRY_UNCLASSIFIED` | "X past rota entries couldn't be matched to a role. They have been preserved in a quarantine list." | "[Review quarantined entries]" → `/settings/migration-issues#quarantine` |

Until the church has zero unresolved entries, the migration banner remains. Dismissing the banner is permitted but does not clear the entries — only triaging each entry does.

**Member email:** at the moment of Phase C cutover, each church admin receives one email summarising the change with links to the same destinations. No emails to non-admin members in v1.

## 10. Availability filtering (requirement 5)

A user is **eligible to submit availability** for a service when there exists at least one row in `service_role_slots` whose `catalogRoleId` is held by the user in `church_member_roles` for this church (regardless of `minCount`; optional slots count as eligible).

**Surface in the rota grid** (`AvailabilityWidget` is currently embedded per cell in the rota grid):
- For services where the user is **not eligible**, the cell renders a single neutral icon (em-dash) with a tooltip: "Not required for this service" (for SAID services) or "You don't have a role required for this service" (for ORGANIST_ONLY when the user is a singer with no Organist role).
- The widget's three buttons (Available / Maybe / Unavailable) are not rendered for ineligible cells.
- Server enforces the same rule (`POST /api/churches/[churchId]/availability` returns 403 `NO_ELIGIBLE_ROLE`).

**Member-level "Submit availability" pages** (current and future): the table of services the user is asked about excludes services for which they are ineligible. A counter in the page header shows "X services awaiting your response" where X is the eligible count.

**Dormant email senders** (`sendAvailabilityReminder` exists in `src/lib/email/send.ts` but is not currently wired): if those are wired up later, the recipient set is filtered by the same eligibility rule.

**Stale availability rows** for services the user is now ineligible for (because their role was revoked) remain in the database but are ignored by all rota-generation and presence queries. The existing availability listing endpoints accept a query parameter `?onlyEligible=true` (default true) that joins to `church_member_roles` and `service_role_slots` and returns only rows where eligibility still holds. Setting `?onlyEligible=false` returns the full historical set for admin debugging. A future janitor job may purge stale rows older than N months; not in scope for v1.

## 11. Rota-allocation validation (requirement 5)

### 11.1 Per-entry validation flow

When a user is added to a rota slot (POST `/api/churches/[churchId]/rota`):

```
INPUT: serviceId, userId, catalogRoleId

1. Auth: caller must be EDITOR or above (existing check).
2. Membership: target user must be a member of churchId. Else 404 USER_NOT_IN_CHURCH.
3. User holds role: ∃ row in church_member_roles for (userId, churchId, catalogRoleId). Else 403 USER_LACKS_ROLE.
4. Service has slot: ∃ row in service_role_slots for (serviceId, catalogRoleId). Else 404 SLOT_NOT_ON_SERVICE.
5. Slot exclusivity: if slot.exclusive AND ∃ row in rota_entries for (serviceId, catalogRoleId) → 409 SLOT_ALREADY_FILLED.
6. Slot capacity: if slot.maxCount IS NOT NULL AND count(rota_entries for that slot) >= maxCount → 409 SLOT_AT_CAPACITY.
7. Insert row.
8. Compute warnings:
   a. DUAL_ROLE — user has one or more other rota_entries on this serviceId with different catalogRoleId. Append to warnings.
9. Return 201 with the new row + warnings.
```

### 11.2 Service-level validation (read-only, surfaced in UI)

For each service, three states:
- **Slot fully filled:** for every `service_role_slots` row, `count(rota_entries) >= minCount`. Service is publish-ready.
- **Slot under-filled:** at least one row has `count < minCount`. Surface as a yellow warning on the services list. Includes services with `choirRequirement=FULL_CHOIR` where any voice part has zero singers.
- **No slots required:** service has zero `service_role_slots` rows. Never warns. The service is always publish-ready and never appears as "needs more singers."

### 11.3 Publish gate

Services with warnings are still publishable in v1 (no hard gate; hard publish gate is deferred secondary item C). The warning surfaces in the publish-confirmation dialog as: "X slots are under-filled. Publish anyway?" with [Cancel] [Publish anyway].

### 11.4 Per-service slot quarantine

When a slot is removed from a service via override (§9.2), existing rota entries for that slot are not deleted. They are flagged via a new column `rota_entries.quarantinedAt timestamp NULL` (added to §6.11). Quarantined entries:
- Do not count toward slot fill validation.
- Are not visible in the active rota grid.
- Are visible in the per-service "Quarantined entries" panel for admin review.
- Can be reinstated by the admin (clear `quarantinedAt`) only after the slot is re-added; until then, the reinstate button is disabled.

## 12. Testing strategy

New test coverage:

- **Unit tests (Vitest):**
  - Role catalog seed: every row in §5 present with expected `key`, `category`, `rotaEligible`, `institutional`.
  - `church_member_roles` assignment / revocation API including atomic primary-flip behaviour.
  - Preset CRUD and slot CRUD (including CHECK-constraint failures for invalid min/max/exclusive combinations).
  - Voice-part `exclusive=true` rejected with `VOICE_PART_CANNOT_BE_EXCLUSIVE`.
  - Slot-exclusivity validation: `exclusive=true` slot blocks a second entry for the same `(serviceId, catalogRoleId)` with 409.
  - Slot capacity: `maxCount` enforcement returns 409 `SLOT_AT_CAPACITY`.
  - Dual-role warning: all single-user multi-slot combos on one service warn but do not block (Director + voice, Organist + voice, Director + Organist, and same-user-two-voice-parts).
  - Availability-eligibility: SAID service rejects all submissions; ORGANIST_ONLY accepts only Organists; CHORAL accepts singers, Organist, Director.
  - Stale-availability filter: `?onlyEligible=true` excludes entries for revoked roles.
  - Rota partial unique constraint: a quarantined entry for `(serviceId, userId, catalogRoleId)` does not block a fresh active entry for the same triple.

- **Music list PDF tests** (extending existing `src/lib/pdf/music-list/__tests__`):
  - `musicListFieldSet=CHORAL`: full set renders (HYMN, ANTHEM, MASS_SETTING_*, CANTICLE_*, RESPONSES, ORGAN_VOLUNTARY_*).
  - `musicListFieldSet=HYMNS_ONLY`: only HYMN and ORGAN_VOLUNTARY_* render; ANTHEM/MASS_SETTING/CANTICLE/RESPONSES suppressed.
  - `musicListFieldSet=READINGS_ONLY`: all music slots suppressed; collect/readings/liturgical text rendered if available.
  - Existing `choirStatus`-based suppression no longer used (regression check that the new behaviour is not double-applied).

- **Migration tests** (new `src/lib/db/__tests__/migration-2026-04-18.test.ts`): a fixture database with legacy data, run phases A → B → C-shadow → D, assert expected final state for:
  - (a) Standard SATB church with existing rotas → all rotas survive with `catalogRoleId` set; three default presets created; patterns mapped.
  - (b) Church with a `choirStatus = SAID_SERVICE_ONLY` service → service mapped to `Said Eucharist` preset, zero slots.
  - (c) Church with a `choirStatus = NO_CHOIR_NEEDED` service → mapped to `Organist-only Eucharist` preset, single Organist slot.
  - (d) Church with a `choirStatus = NO_SERVICE` service → archived.
  - (e) Member with `voicePart = NULL` → no `church_member_roles` rows; `MEMBER_NO_VOICE_PART` audit log entry written.
  - (f) Two patterns mapping to same preset with different times → `defaultTime` NULL; `PRESET_TIME_AMBIGUOUS` audit log written.
  - (g) Rota entry where membership had `voicePart=NULL` → moved to `quarantined_rota_entries`; `ROTA_ENTRY_UNCLASSIFIED` audit log written.
  - (h) Idempotence: rerun Phase B against partially-applied state (simulated by partial commit). All `INSERT … ON CONFLICT DO NOTHING` paths exercised.

- **E2E tests (Playwright)** (new `e2e/role-configurability.spec.ts`):
  - Admin creates a new preset, edits its slots, creates a pattern referencing it, and a generated service inherits the correct slots.
  - Singer with only Organist role submits availability — only sees ORGANIST_ONLY and CHORAL services.
  - Singer without Organist role does not see availability widget for ORGANIST_ONLY service; sees em-dash with tooltip.
  - Admin assigns Director and Bass roles to one member; rota-grid in default view shows one row with two pills; in role-grouped view shows two rows.
  - Admin edits a preset post-facto; past service slots unchanged (snapshot integrity).
  - Admin removes a slot from a single service; existing rota entries are quarantined and visible in the panel.
  - Migration banner appears for an existing church on first login post-migration; clicking through to "Migration issues" lists `PRESET_TIME_AMBIGUOUS` for the configured fixture.

## 13. Decisions made autonomously during drafting

These are decisions resolved during drafting and review without explicit user input. Any can be reversed:

1. **All dual-role combinations on one service are soft warnings, never hard blocks** (per user direction during brainstorm). Slot-level `exclusive=true` cardinality remains a hard constraint (one entry per exclusive slot); putting the same person in two different exclusive slots is permitted with a warning.

2. **`choirStatus` is dropped entirely** rather than kept as a convenience denormalised column. Slot presence is the source of truth. Denormalised columns invite drift.

3. **Migration creates three presets per church unconditionally** — `Default Choral`, `Organist-only Eucharist`, `Said Eucharist`. Trivial to archive if unwanted.

4. **Deacon and Subdeacon are the only per-service liturgical roles** in the catalog (per user direction). No Crucifer, Thurifer, etc. in v1. Liturgical servers feature flagged in §3 non-goals.

5. **Services with legacy `choirStatus = 'NO_SERVICE'` are archived, not migrated.** Migration preserves data but excludes them from active queries.

6. **Services with legacy `choirStatus = 'NO_CHOIR_NEEDED'` are mapped to `Organist-only Eucharist` preset.** Preserves the historical "organist-but-no-choir" intent. The alternative of mapping them to Default Choral would have over-claimed roles.

7. **Institutional appointments have no history table.** Reassigning a role from old DoM to new DoM in `church_member_roles` is the supported flow. Historical tracking was deferred in §3.

8. **Preset `defaultTime` can be NULL.** Migration uses NULL when sibling patterns disagree on time, forcing explicit admin action.

9. **Primary role flag (`isPrimary` on `church_member_roles`) is app-level, not a DB partial unique index.** Weekly audit query in §17 catches drift.

10. **Pattern-level `enabled` retained** rather than folded into preset `archivedAt`. Disabling a pattern (e.g. for a season) is semantically distinct from archiving its preset.

11. **Default rota grid view is "one row per member" with role pills**, not "one row per (member × role)." Role-grouped view is a toggle. This avoids the row explosion flagged by review and preserves the existing mental model for small churches.

12. **Migration audit log** is its own table, with severity levels and per-church banners. No quiet-failure mode.

13. **Phase B uses `quarantined_rota_entries` table for orphaned entries** rather than retaining NULL `catalogRoleId` rows. Lets Phase D enforce NOT NULL safely while preserving data.

14. **Catalog rows are immutable in v1** — no admin-facing archive, rename, or delete. Future archival reserved.

## 14. Open items flagged for implementation

The following are deliberately left to the implementation-plan stage rather than specified here:

- Exact Drizzle schema syntax for each new table (the plan will translate §6 to real code).
- Exact UI component tree for the presets admin page, the institution page, and the rebuilt rota grid.
- Exact email-notification behaviour for availability prompts (today all email senders for availability reminders are declared but unused; this design does not require waking them up, but the implementation plan may choose to).
- Exact English error-message copy for validation failures (the codes are specified in §8.3).
- Exact `role_catalog` display-order values — to be set during implementation.
- **Pre-built starter presets for Mattins, Evensong, Compline, Wedding, Funeral, Occasional Office** — deferred to a v1.1 follow-up seed migration. Schema and admin self-serve creation are in v1.
- **Liturgical-season tag UI surfaces** (filter in rota grid, divider in music list) — deferred to a v1.1 follow-up. Schema and edit UI are in v1.
- **Super-admin gating** of `/api/admin/migration-log` — interim env-var allowlist; full role implementation in a separate spec.
- **Per-row audit log** ("who edited this preset slot when") — deferred; would require a generic audit-log layer.
- **Janitor for stale availability rows** — deferred; storage cost negligible.

## 14a. Secondary-items coverage map

| Item | Status in this spec | Where |
|---|---|---|
| **A** — Additional named roles (Cantor, Deacon/Subdeacon, Deputy Organist, Assistant Director, generic Instrumentalist) | Partially as user-edited: Cantor and Choral Scholar removed by user direction; Deacon, Subdeacon, Deputy Organist, Assistant Director, generic Instrumentalist are in §5. | §5 catalog |
| **B** — Expanded service-type presets (Mattins, Evensong, Compline, Wedding, Funeral, Occasional Office) | **Partially:** the schema and preset-creation API support arbitrary service types and the existing `serviceTypeEnum` already includes `CHORAL_EVENSONG`, `CHORAL_MATINS`, `COMPLINE`, `FAMILY_SERVICE`. The migration only seeds three presets per church (Choral, Organist-only, Said). Admin self-serve creation of additional presets covers the rest. **Pre-built starter presets for Evensong/Mattins/Compline/Wedding/Funeral/Occasional Office are deferred to a follow-up seed migration in a v1.1 patch** — design supports them but spec does not enumerate the slot configs. Documented in §14. |
| **I** — Per-service-type music-list field config | Full. `musicListFieldSet` enum with three values; PDF rendering branches accordingly. | §6.6, §9.2, §12 |
| **J** — Liturgical-season tagging | Schema only in v1. `liturgicalSeasonTags` exists on presets and is editable in the Advanced panel; no v1 surface in rota grid or music list. Deferred to a follow-up that adds season-aware filtering and music-list section dividers. | §6.4, §9.1, §14 |

## 15. Acceptance criteria

Design is deliverable when:
1. Every existing church's rotas and availability survive the migration untouched in terms of who-is-on-which-service.
2. A new church sees three presets out of the box and can create a service from any of them.
3. An admin can add a user to the catalog `Organist` role and that user sees availability prompts only for services with an active Organist slot.
4. A service created from a `SAID` preset generates no availability prompts and no validation warnings.
5. The music list PDF renders differently for a `READINGS_ONLY` preset than for a `CHORAL` preset.
6. A user rota'd as Director sees no hard block when also being rota'd as Bass for the same service, but sees a warning toast.
7. A user rota'd as Organist is permitted to be additionally rota'd as a voice part for the same service, with a soft warning surfaced in the UI response.
8. Editing a preset does not modify the role slots of any previously-created service.

## 16. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase B backfill produces incorrect pattern→preset mapping for an unusual `serviceType` (`CUSTOM`) | Medium | Medium | `CUSTOM` defaults to `Default Choral`; admin can re-point the pattern post-migration; `migration_audit_log` writes an INFO entry per `CUSTOM` mapping for visibility. |
| Admins ignore migration banner indefinitely; orphaned data accumulates | Medium | Low | Banner persists until triaged; quarantine surfaces are admin-visible; no hard impact on rota generation. |
| `preset_role_slots` referential rule (`rotaEligible=true`) drift if a future seed migration flips a flag on a catalog row | Low | Medium | Catalog rows are immutable in v1 (§6.1 Lifecycle). A pre-deploy lint script in CI validates this for any future seed migration. Weekly audit query (§17) catches drift. |
| Drizzle migration partial failure mid-Phase-B leaves database in inconsistent state | Low | High | Phase B is wrapped in a single transaction; on error, rollback is automatic. `migration_phase_state` table prevents accidental re-execution after success. |
| Rota grid performance degrades for large churches (~30 members × ~8 active roles × 12 services = 2880 cells) | Medium | Medium | Default-view "one row per member" caps to ~30 rows × 12 cols = 360 cells, comfortable. Role-grouped view caps to (members × roles) ≤ ~240 rows for outliers; pagination by month if needed. Performance test in §17. |
| Snapshot pattern leads to drift between live preset config and historical service slots, confusing admins | High | Low | UI surfaces the source preset on each service detail page with a "Restore from preset" affordance. Admins can opt into propagation per service. Documented in §9.2. |
| User holds many roles; UI for role assignment becomes cluttered | Medium | Low | Multi-role chooser uses category-grouped picker with primary radio; mobile design stacks. Tested in E2E. |
| Stale availability rows accumulate forever | Low | Low | Filterable in queries; janitor deferred. Storage cost is negligible (rows are small). |
| Email notification storm if `sendAvailabilityReminder` is later wired and it fans out to thousands of members | Low | Medium | Out of scope for v1; flagged in §14 for the future implementer to design rate-limiting and batching. |

## 17. Monitoring and observability

- **Migration audit log** (§7) is the primary signal during/after migration. Severity counts surface to the super-admin dashboard.
- **`migration_phase_state`** records phase completion timestamps; alerts fire if Phase B has not completed within 24h of starting.
- **Daily audit query** (cron, deferred from v1 to a follow-up if needed):
  ```sql
  SELECT COUNT(*) FROM preset_role_slots ps
    JOIN role_catalog rc ON rc.id = ps.catalogRoleId
    WHERE rc.rotaEligible = false;
  ```
  Alerts if non-zero — would indicate either a bug in the API validation or a manual SQL bypass.
- **Weekly audit query**:
  ```sql
  SELECT churchId, userId, COUNT(*) FROM church_member_roles
    WHERE isPrimary = true
    GROUP BY churchId, userId
    HAVING COUNT(*) > 1;
  ```
  Alerts if non-zero — would indicate the API-level invariant has been violated.
- **Per-endpoint metrics** (latency, error rate) follow existing `request-context.ts` instrumentation. New error codes (`SLOT_NOT_ON_SERVICE`, `USER_LACKS_ROLE`, `SLOT_AT_CAPACITY`, `SLOT_ALREADY_FILLED`, `NO_ELIGIBLE_ROLE`, `DUAL_ROLE`, `ROLE_NOT_ROTA_ELIGIBLE`, `VOICE_PART_CANNOT_BE_EXCLUSIVE`, `INVALID_SLOT_CARDINALITY`, `MEMBER_NO_VOICE_PART`, `PRESET_TIME_AMBIGUOUS`, `ROTA_ENTRY_UNCLASSIFIED`) are added to the `lib/api-helpers.ts` enumeration.
- **Performance baseline:** rota grid load time and music-list PDF generation time are baselined pre-Phase-C and re-measured one week post-Phase-C. Regression > 20% triggers investigation.

## 18. Security and authorisation

- All new endpoints inherit the existing `requireChurchRole(churchId, minRole)` pattern from `src/lib/auth/permissions.ts` (MEMBER < EDITOR < ADMIN).
- **Preset / catalog-role / institutional-appointment management requires ADMIN.** Per-service slot overrides require EDITOR (consistent with existing service-edit auth).
- **Role assignments to members** require ADMIN (consistent with existing member-edit auth).
- **Migration audit log** is super-admin only — a new `superAdmin` role flag added to `users` table (separate migration, out of scope for this design beyond the column existing). Until super-admin exists, the `/api/admin/migration-log` endpoint is gated by an env var allowlist.
- **Rate limiting:** new write endpoints inherit the existing `lib/rate-limit.ts` per-user buckets. Slot-edit and rota-entry endpoints share the existing `editor-write` bucket. Migration-log dismissal uses a low-rate `super-admin-write` bucket.
- **Audit fields:** `church_service_presets`, `preset_role_slots`, `church_member_roles` carry `createdAt`/`updatedAt`. Per-row "who changed this" tracking is deferred (would require a generic audit-log layer; not in scope).
- **Tenancy:** every per-church table has a `churchId` column with FK; all queries filter by `churchId` via the existing `requireChurchRole` middleware.
- **Leaked enumeration risk:** `GET /api/role-catalog` is shared across all tenants but contains only public taxonomy; no PII.
- **Institutional appointments are church-scoped data** and visible only to members of that church; not exposed publicly.

## 19. Performance considerations

- **New indexes** (specified inline in §6) cover the hot read paths: rota grid load (`(churchId, catalogRoleId)`, `(serviceId)`), preset edit (`(presetId)`), availability filtering join.
- **Availability eligibility query** is a join across `church_member_roles` × `service_role_slots` — bounded by `O(member roles × service slots)` per service, both small numbers per church.
- **Rota grid query** previously fetched members + voice parts + availability; new query adds a join on `church_member_roles`. Expected impact: <10ms on a typical church (30 members × 12 services).
- **Music list PDF generation** changes from `choirStatus` filter to `musicListFieldSet` switch; same N+1-or-better query shape (no new N+1 introduced).
- **Migration cost:** Phase B is O(rows) per table; expected runtime < 1 minute for the largest existing church (rough estimate from current row counts; to be measured during dev).
- **Drizzle query plans** to be reviewed during implementation for the rota-grid main query and the availability-eligibility check; both should use indexes.

## 20. Alternatives considered

| Alternative | Why not chosen |
|---|---|
| **Per-church custom role catalog** (Q2 option A) | Heavy duplication; hard to evolve globally; no path to add new roles centrally. |
| **Hybrid catalog + per-church custom roles** (Q2 option C) | Polymorphic FKs add complexity; "Other Instrumentalist" with free-text label covers the same need at lower cost. |
| **Extend `serviceTypeTemplates` with role-slot config** (Q5 option A) | Conflates service type with personnel; one church may have three different Eucharists with different forces. |
| **Per-service slot config without preset abstraction** (Q5 option C) | Doesn't match the spec's "preset" language; admins maintain ~52 services/year by hand instead of editing one preset. |
| **Two separate tables for rota-eligible vs institutional roles** | Forces duplicate logic for roles that are both (Sub-Organist, LLM, Deacon, Subdeacon). One catalog with `category` + flags is simpler. |
| **JSON column for member roles** | Loses referential integrity; can't enforce cardinality; hard to query "who can fill X." |
| **Pattern-level time override of preset default time** | Adds nullable column with non-trivial precedence rules; admins prefer "create another preset" mental model. |
| **Hard exclusivity blocks for Director + voice / Organist + voice** | User explicitly relaxed this. Soft warning preserves flexibility for small parishes. |
| **Live preset → service propagation (no snapshot)** | Editing a preset would silently mutate historical rotas; surprising and dangerous. Snapshot is safer. |
| **Live archival/recoverable archival of presets in v1** | YAGNI; clone-from-archived covers recovery. |
| **Institutional appointment history table with date ranges** | Out of scope; current-state via `church_member_roles` covers the v1 use case. |
| **Hard publish gate on under-filled slots** | Deferred secondary item C; v1 surfaces a warning on publish. |
| **Per-service-sheet "no choir needed" hardcoded message** (current behaviour) | Replaced by the more general `musicListFieldSet` mechanism; old string repurposed as section header where needed. |
