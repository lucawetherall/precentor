# Per-Church Role Configurability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Precentor from hard-coded SATB to a configurable role catalog, multi-role members, per-church service presets with role-slot snapshots, and full migration of existing churches with no data loss.

**Architecture:** Eight milestones, each independently mergeable and committable. Milestone 1 introduces the schema additively without touching existing code paths. Milestones 2–3 add the backend for catalog + presets. Milestone 4 is the big migration script. Milestones 5–7 are UI + code cutover behind a feature flag. Milestone 8 tightens constraints and drops legacy columns.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (PostgreSQL via Supabase), Vitest + React Testing Library for unit tests, Playwright for E2E, Zod for validation, Tailwind + shadcn-style components. Deploys use `drizzle-kit push` against the TS schema; historical `.sql` files in `drizzle/` are snapshots, not source of truth.

**Spec:** `docs/superpowers/specs/2026-04-18-per-church-role-configurability-design.md`. All section references below are to this spec.

---

## Working conventions for every task

- **TDD:** test first; run and see it fail; minimal implementation; run and see it pass; commit.
- **Commits:** conventional-commits style. Every task ends with a commit.
- **Error envelope:** match existing `src/lib/api-helpers.ts` shape — `{ error: string, code?: string, details?: unknown }`. Do NOT invent a new `{success, data, warnings}` wrapper. Warnings ride inside `details`.
- **Schema changes:** edit `src/lib/db/schema-base.ts` (or a new `src/lib/db/schema-roles.ts` re-exported from `schema.ts`). Never hand-author SQL files under `drizzle/`; `drizzle-kit push` is the deploy mechanism.
- **Data migrations:** TS scripts under `scripts/`, invocable via `tsx`. Add a `package.json` script for each.
- **Feature flag:** `USE_ROLE_SLOTS_MODEL` env var, default `false` in code until Milestone 7. Read via `process.env.USE_ROLE_SLOTS_MODEL === 'true'`.
- **Imports:** always `@/lib/db/schema` (not `schema-base` directly); `@/lib/api-helpers`; `@/lib/auth/permissions`.
- **Paths use Next.js App Router route groups.** Pages live under `src/app/(app)/churches/[churchId]/...`. API routes under `src/app/api/churches/[churchId]/...`.

---

## Milestone 1 — Additive schema + role catalog seed

**Outcome:** all new tables exist in the schema, the catalog is seeded, and `drizzle-kit push` runs cleanly. No existing code paths touched. Deployable standalone.

### Task 1.1: Create role-category, choir-requirement, music-list-field-set enums

**Files:**
- Modify: `src/lib/db/schema-base.ts` (add enums after line 41)

- [ ] **Step 1: Add the three enums after `choirStatusEnum`**

In `src/lib/db/schema-base.ts`, directly after line 41, add:

```ts
export const roleCategoryEnum = pgEnum("role_category", [
  "VOICE",
  "MUSIC_DIRECTION",
  "MUSIC_INSTRUMENT",
  "CLERGY_PARISH",
  "CLERGY_CATHEDRAL",
  "LAY_MINISTRY",
]);
export const choirRequirementEnum = pgEnum("choir_requirement", [
  "FULL_CHOIR",
  "ORGANIST_ONLY",
  "SAID",
]);
export const musicListFieldSetEnum = pgEnum("music_list_field_set", [
  "CHORAL",
  "HYMNS_ONLY",
  "READINGS_ONLY",
]);
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema-base.ts
git commit -m "feat(db): add role-category, choir-requirement, music-list-field-set enums"
```

### Task 1.2: Create `role_catalog` table

**Files:**
- Modify: `src/lib/db/schema-base.ts`

- [ ] **Step 1: Add the `roleCatalog` table declaration at the end of the file (after `rateLimitBuckets`)**

```ts
// ─── Role catalog (global, seeded) ───────────────────────────
export const roleCatalog = pgTable("role_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  defaultName: text("default_name").notNull(),
  category: roleCategoryEnum("category").notNull(),
  rotaEligible: boolean("rota_eligible").default(false).notNull(),
  institutional: boolean("institutional").default(false).notNull(),
  defaultExclusive: boolean("default_exclusive").default(true).notNull(),
  defaultMinCount: integer("default_min_count").default(1).notNull(),
  defaultMaxCount: integer("default_max_count"),
  displayOrder: integer("display_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("role_catalog_category_idx").on(t.category),
  index("role_catalog_display_idx").on(t.displayOrder),
]);
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Push schema to local dev DB**

Run: `npx drizzle-kit push`
Expected: prompts to create `role_catalog` + its enum — confirm. No data warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema-base.ts
git commit -m "feat(db): add role_catalog table"
```

### Task 1.3: Create `church_member_roles`, `church_service_presets`, `preset_role_slots`, `service_role_slots` tables

**IMPORTANT — partial unique index syntax verification:** This task uses `.where(sql\`archived_at IS NULL\`)` on a `uniqueIndex`. Drizzle ORM 0.45+ supports partial indexes, but the `.where()` chained form may not be the correct API. Before committing this task:
- Run `npx drizzle-kit push` and inspect the generated SQL — it should contain `CREATE UNIQUE INDEX ... WHERE archived_at IS NULL`.
- If the push succeeds but the partial clause is missing from the SQL, fall back to a plain `uniqueIndex` without the partial WHERE; the app-level validation in the preset POST endpoint (Milestone 3) already rejects duplicate names among non-archived presets.
- If the push errors, the correct form may be `uniqueIndex("preset_name_unique").on(t.churchId, t.name).where(sql\`archived_at IS NULL\`)` — exactly as shown here — but double-check against current Drizzle docs.


**Files:**
- Modify: `src/lib/db/schema-base.ts`

- [ ] **Step 1: Add all four tables at the end of the file**

```ts
// ─── Church member roles (replaces voicePart column) ─────────
export const churchMemberRoles = pgTable("church_member_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  catalogRoleId: uuid("catalog_role_id").notNull().references(() => roleCatalog.id, { onDelete: "restrict" }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("cmr_unique").on(t.userId, t.churchId, t.catalogRoleId),
  index("cmr_church_role_idx").on(t.churchId, t.catalogRoleId),
  index("cmr_user_church_idx").on(t.userId, t.churchId),
]);

// ─── Church service presets ──────────────────────────────────
export const churchServicePresets = pgTable("church_service_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  defaultTime: text("default_time"),
  choirRequirement: choirRequirementEnum("choir_requirement").notNull(),
  liturgicalTemplateId: uuid("liturgical_template_id"),
  musicListFieldSet: musicListFieldSetEnum("music_list_field_set").notNull(),
  liturgicalSeasonTags: text("liturgical_season_tags").array().default([]).notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("preset_name_unique").on(t.churchId, t.name).where(sql`archived_at IS NULL`),
  index("preset_church_idx").on(t.churchId),
  index("preset_church_archived_idx").on(t.churchId, t.archivedAt),
]);

// ─── Preset role slots ───────────────────────────────────────
export const presetRoleSlots = pgTable("preset_role_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  presetId: uuid("preset_id").notNull().references(() => churchServicePresets.id, { onDelete: "cascade" }),
  catalogRoleId: uuid("catalog_role_id").notNull().references(() => roleCatalog.id, { onDelete: "restrict" }),
  minCount: integer("min_count").default(0).notNull(),
  maxCount: integer("max_count"),
  exclusive: boolean("exclusive").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (t) => [
  uniqueIndex("preset_slot_unique").on(t.presetId, t.catalogRoleId),
  index("preset_slot_preset_idx").on(t.presetId),
]);

// ─── Service role slots (per-service snapshot) ────────────────
export const serviceRoleSlots = pgTable("service_role_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  catalogRoleId: uuid("catalog_role_id").notNull().references(() => roleCatalog.id, { onDelete: "restrict" }),
  minCount: integer("min_count").default(0).notNull(),
  maxCount: integer("max_count"),
  exclusive: boolean("exclusive").notNull(),
  displayOrder: integer("display_order").notNull(),
}, (t) => [
  uniqueIndex("service_slot_unique").on(t.serviceId, t.catalogRoleId),
  index("service_slot_service_idx").on(t.serviceId),
]);
```

Add `sql` to the imports at the top of the file:
```ts
import { sql } from "drizzle-orm";
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Push schema**

Run: `npx drizzle-kit push`
Expected: creates the four tables. Confirm at prompts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema-base.ts
git commit -m "feat(db): add member roles, presets, preset slots, service slots tables"
```

### Task 1.4: Add nullable `presetId` to `churchServicePatterns` and `services`; add nullable `catalogRoleId` and `quarantinedAt` to `rotaEntries`

**Files:**
- Modify: `src/lib/db/schema-base.ts` (lines 281-289, 317-326, 135-158)

- [ ] **Step 1: Edit `rotaEntries` to add nullable columns**

Find the `rotaEntries` definition (around lines 281-289). Replace with:

```ts
export const rotaEntries = pgTable("rota_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  confirmed: boolean("confirmed").default(false).notNull(),
  catalogRoleId: uuid("catalog_role_id").references(() => roleCatalog.id, { onDelete: "restrict" }),
  quarantinedAt: timestamp("quarantined_at"),
}, (t) => [
  uniqueIndex("rota_unique").on(t.serviceId, t.userId),
  index("rota_service_idx").on(t.serviceId),
  index("rota_service_active_idx").on(t.serviceId).where(sql`quarantined_at IS NULL`),
]);
```

- [ ] **Step 2: Edit `churchServicePatterns` to add nullable `presetId`**

Find (lines 317-326). Replace with:

```ts
export const churchServicePatterns = pgTable("church_service_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  time: text("time"),
  enabled: boolean("enabled").default(true).notNull(),
  presetId: uuid("preset_id").references(() => churchServicePresets.id, { onDelete: "set null" }),
}, (t) => [
  uniqueIndex("church_service_pattern_unique").on(t.churchId, t.dayOfWeek, t.serviceType),
]);
```

- [ ] **Step 3: Edit `services` to add nullable `presetId`**

Find (lines 135-158). Add `presetId` nullable column and keep everything else unchanged:

```ts
  presetId: uuid("preset_id").references(() => churchServicePresets.id, { onDelete: "set null" }),
```

Place it directly after the `choirStatus` line.

- [ ] **Step 4: Run typecheck and push**

Run: `npm run typecheck && npx drizzle-kit push`
Expected: typecheck PASS; push prompts for ALTER TABLE additions, confirm.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema-base.ts
git commit -m "feat(db): add nullable presetId/catalogRoleId/quarantinedAt columns for migration"
```

### Task 1.5: Add operational tables — `migrationPhaseState`, `migrationAuditLog`, `quarantinedRotaEntries`

**Files:**
- Modify: `src/lib/db/schema-base.ts`

- [ ] **Step 1: Append at end of file**

```ts
// ─── Migration operational tables ────────────────────────────
export const migrationPhaseState = pgTable("migration_phase_state", {
  phase: text("phase").primaryKey(),  // "A" | "B" | "D"
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const migrationSeverityEnum = pgEnum("migration_severity", ["INFO", "WARN", "ERROR"]);

export const migrationAuditLog = pgTable("migration_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  phase: text("phase").notNull(),
  churchId: uuid("church_id").references(() => churches.id, { onDelete: "cascade" }),
  severity: migrationSeverityEnum("severity").notNull(),
  code: text("code").notNull(),
  details: jsonb("details").default({}).notNull(),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("mal_church_idx").on(t.churchId),
  index("mal_code_idx").on(t.code),
  index("mal_dismissed_idx").on(t.dismissedAt),
]);

export const quarantinedRotaEntries = pgTable("quarantined_rota_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalEntryId: uuid("original_entry_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  userId: uuid("user_id").notNull(),
  confirmed: boolean("confirmed").notNull(),
  quarantineReason: text("quarantine_reason").notNull(),
  quarantinedAt: timestamp("quarantined_at").defaultNow().notNull(),
}, (t) => [
  index("qre_service_idx").on(t.serviceId),
  index("qre_user_idx").on(t.userId),
]);
```

- [ ] **Step 2: Typecheck, push, commit**

```bash
npm run typecheck && npx drizzle-kit push
git add src/lib/db/schema-base.ts
git commit -m "feat(db): add migration phase state, audit log, and quarantine tables"
```

### Task 1.6: Create seed module for the role catalog

**Files:**
- Create: `src/lib/db/seed-role-catalog.ts`
- Create: `src/lib/db/__tests__/seed-role-catalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/__tests__/seed-role-catalog.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ROLE_CATALOG_SEED } from "../seed-role-catalog";

describe("ROLE_CATALOG_SEED", () => {
  it("includes the 38 expected catalog rows", () => {
    expect(ROLE_CATALOG_SEED).toHaveLength(38);
  });

  it("has unique keys across all rows", () => {
    const keys = ROLE_CATALOG_SEED.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every row has rotaEligible or institutional true", () => {
    for (const r of ROLE_CATALOG_SEED) {
      expect(r.rotaEligible || r.institutional).toBe(true);
    }
  });

  it("voice parts are rota-eligible with exclusive=false", () => {
    const voices = ROLE_CATALOG_SEED.filter((r) => r.category === "VOICE");
    expect(voices).toHaveLength(4);
    for (const v of voices) {
      expect(v.rotaEligible).toBe(true);
      expect(v.defaultExclusive).toBe(false);
    }
  });

  it("Director has rotaEligible=true", () => {
    const director = ROLE_CATALOG_SEED.find((r) => r.key === "DIRECTOR");
    expect(director?.rotaEligible).toBe(true);
  });

  it("Director of Music is institutional-only", () => {
    const dom = ROLE_CATALOG_SEED.find((r) => r.key === "DIRECTOR_OF_MUSIC");
    expect(dom?.institutional).toBe(true);
    expect(dom?.rotaEligible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/db/__tests__/seed-role-catalog.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the seed module**

Create `src/lib/db/seed-role-catalog.ts`:

```ts
export interface RoleCatalogSeedRow {
  key: string;
  defaultName: string;
  category: "VOICE" | "MUSIC_DIRECTION" | "MUSIC_INSTRUMENT" | "CLERGY_PARISH" | "CLERGY_CATHEDRAL" | "LAY_MINISTRY";
  rotaEligible: boolean;
  institutional: boolean;
  defaultExclusive: boolean;
  defaultMinCount: number;
  defaultMaxCount: number | null;
  displayOrder: number;
}

export const ROLE_CATALOG_SEED: RoleCatalogSeedRow[] = [
  // VOICE
  { key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100 },
  { key: "ALTO",    defaultName: "Alto",    category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 110 },
  { key: "TENOR",   defaultName: "Tenor",   category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 120 },
  { key: "BASS",    defaultName: "Bass",    category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 130 },
  // MUSIC_DIRECTION
  { key: "DIRECTOR",           defaultName: "Director",           category: "MUSIC_DIRECTION", rotaEligible: true,  institutional: false, defaultExclusive: true, defaultMinCount: 1, defaultMaxCount: 1,    displayOrder: 200 },
  { key: "ASSISTANT_DIRECTOR", defaultName: "Assistant Director", category: "MUSIC_DIRECTION", rotaEligible: true,  institutional: false, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 210 },
  { key: "DIRECTOR_OF_MUSIC",  defaultName: "Director of Music",  category: "MUSIC_DIRECTION", rotaEligible: false, institutional: true,  defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 220 },
  { key: "ASSISTANT_DIRECTOR_OF_MUSIC", defaultName: "Assistant Director of Music", category: "MUSIC_DIRECTION", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 230 },
  // MUSIC_INSTRUMENT
  { key: "ORGANIST",            defaultName: "Organist",            category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 1, defaultMaxCount: 1,    displayOrder: 300 },
  { key: "ASSISTANT_ORGANIST",  defaultName: "Assistant Organist",  category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 310 },
  { key: "SUB_ORGANIST",        defaultName: "Sub-Organist",        category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: true,  defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 320 },
  { key: "DEPUTY_ORGANIST",     defaultName: "Deputy Organist",     category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 330 },
  { key: "ORGAN_SCHOLAR",       defaultName: "Organ Scholar",       category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: true,  defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 340 },
  { key: "INSTRUMENTALIST",     defaultName: "Instrumentalist",     category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 350 },
  // CLERGY_PARISH
  { key: "VICAR",             defaultName: "Vicar",             category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 400 },
  { key: "RECTOR",            defaultName: "Rector",            category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 410 },
  { key: "PRIEST_IN_CHARGE",  defaultName: "Priest-in-Charge",  category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 420 },
  { key: "ASSOCIATE_VICAR",   defaultName: "Associate Vicar",   category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 430 },
  { key: "CURATE",            defaultName: "Curate",            category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 440 },
  { key: "DEACON",            defaultName: "Deacon",            category: "CLERGY_PARISH", rotaEligible: true,  institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 450 },
  { key: "SUBDEACON",         defaultName: "Subdeacon",         category: "CLERGY_PARISH", rotaEligible: true,  institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 460 },
  // CLERGY_CATHEDRAL
  { key: "BISHOP",             defaultName: "Bishop",             category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 500 },
  { key: "ARCHBISHOP",         defaultName: "Archbishop",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 510 },
  { key: "DEAN",               defaultName: "Dean",               category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 520 },
  { key: "SUB_DEAN",           defaultName: "Sub-Dean",           category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 530 },
  { key: "PROVOST",            defaultName: "Provost",            category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 540 },
  { key: "ARCHDEACON",         defaultName: "Archdeacon",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 550 },
  { key: "CANON_RESIDENTIARY", defaultName: "Canon Residentiary", category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 560 },
  { key: "CANON_PRECENTOR",    defaultName: "Canon Precentor",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 570 },
  { key: "CANON_CHANCELLOR",   defaultName: "Canon Chancellor",   category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 580 },
  { key: "CANON_TREASURER",    defaultName: "Canon Treasurer",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 590 },
  { key: "CANON_MISSIONER",    defaultName: "Canon Missioner",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 600 },
  { key: "HONORARY_CANON",     defaultName: "Honorary Canon",     category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 610 },
  { key: "LAY_CANON",          defaultName: "Lay Canon",          category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 620 },
  { key: "PREBENDARY",         defaultName: "Prebendary",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 630 },
  { key: "SUCCENTOR",          defaultName: "Succentor",          category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 640 },
  // LAY_MINISTRY
  { key: "LLM",                     defaultName: "Licensed Lay Minister (Reader)", category: "LAY_MINISTRY", rotaEligible: true, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 700 },
  { key: "LAY_PASTORAL_MINISTER",   defaultName: "Lay Pastoral Minister",          category: "LAY_MINISTRY", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 710 },
  { key: "LAY_WORSHIP_LEADER",      defaultName: "Lay Worship Leader",             category: "LAY_MINISTRY", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 720 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/db/__tests__/seed-role-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/seed-role-catalog.ts src/lib/db/__tests__/seed-role-catalog.test.ts
git commit -m "feat(db): add role catalog seed data with 38 entries"
```

### Task 1.7: Script that seeds the role catalog into the DB (idempotent)

**Files:**
- Create: `scripts/seed-role-catalog.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-role-catalog.ts`:

```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { roleCatalog } from "../src/lib/db/schema";
import { ROLE_CATALOG_SEED } from "../src/lib/db/seed-role-catalog";

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const row of ROLE_CATALOG_SEED) {
    const result = await db
      .insert(roleCatalog)
      .values(row)
      .onConflictDoNothing({ target: roleCatalog.key })
      .returning({ id: roleCatalog.id });
    if (result.length > 0) inserted++;
    else skipped++;
  }
  console.log(`role_catalog seed: inserted=${inserted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the `package.json` script**

In `package.json`, add to `scripts`:
```json
"db:seed-role-catalog": "tsx scripts/seed-role-catalog.ts",
```

- [ ] **Step 3: Run it**

Run: `npm run db:seed-role-catalog`
Expected: `role_catalog seed: inserted=38 skipped=0` on first run. Running it again: `inserted=0 skipped=38`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-role-catalog.ts package.json
git commit -m "feat(db): seed script for role catalog"
```

### Task 1.8: Add Drizzle relations for the new tables

**Files:**
- Modify: `src/lib/db/relations.ts`

- [ ] **Step 1: Read the existing file**

Read `src/lib/db/relations.ts` to see the current relation declarations and their style.

- [ ] **Step 2: Add relations for the new tables**

Append to `src/lib/db/relations.ts`:

```ts
import { relations } from "drizzle-orm";
import {
  roleCatalog,
  churchMemberRoles,
  churchServicePresets,
  presetRoleSlots,
  serviceRoleSlots,
  churches,
  users,
  services,
  churchServicePatterns,
  rotaEntries,
} from "./schema";

// (Keep existing relation declarations intact; these are additive.)

export const roleCatalogRelations = relations(roleCatalog, ({ many }) => ({
  memberRoles: many(churchMemberRoles),
  presetSlots: many(presetRoleSlots),
  serviceSlots: many(serviceRoleSlots),
}));

export const churchMemberRolesRelations = relations(churchMemberRoles, ({ one }) => ({
  user: one(users, { fields: [churchMemberRoles.userId], references: [users.id] }),
  church: one(churches, { fields: [churchMemberRoles.churchId], references: [churches.id] }),
  role: one(roleCatalog, { fields: [churchMemberRoles.catalogRoleId], references: [roleCatalog.id] }),
}));

export const churchServicePresetsRelations = relations(churchServicePresets, ({ one, many }) => ({
  church: one(churches, { fields: [churchServicePresets.churchId], references: [churches.id] }),
  slots: many(presetRoleSlots),
  patterns: many(churchServicePatterns),
  services: many(services),
}));

export const presetRoleSlotsRelations = relations(presetRoleSlots, ({ one }) => ({
  preset: one(churchServicePresets, { fields: [presetRoleSlots.presetId], references: [churchServicePresets.id] }),
  role: one(roleCatalog, { fields: [presetRoleSlots.catalogRoleId], references: [roleCatalog.id] }),
}));

export const serviceRoleSlotsRelations = relations(serviceRoleSlots, ({ one }) => ({
  service: one(services, { fields: [serviceRoleSlots.serviceId], references: [services.id] }),
  role: one(roleCatalog, { fields: [serviceRoleSlots.catalogRoleId], references: [roleCatalog.id] }),
}));
```

Merge imports with whatever is already in the file — don't duplicate.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (Merge any import-related errors by consolidating.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/relations.ts
git commit -m "feat(db): add Drizzle relations for role catalog and preset tables"
```

---

## Milestone 1 exit criteria

- `npx drizzle-kit push` runs cleanly against dev DB.
- `npm run db:seed-role-catalog` populates 38 rows; second run is idempotent.
- `npm run typecheck` passes.
- `npm test` passes.
- No existing functionality touched; all existing tests still pass.

---

**NOTE TO IMPLEMENTER:** This plan continues in `2026-04-19-per-church-role-configurability-part2.md` (Milestones 2–4) and `2026-04-19-per-church-role-configurability-part3.md` (Milestones 5–8). Each part is self-contained and follows the same conventions as Milestone 1 above. Start by reading this part, then Part 2, then Part 3.
