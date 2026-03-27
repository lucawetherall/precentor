# Service Editor Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all liturgical data from code to database, make service structure configurable per church, add hymn verse text, and introduce an editable booklet preview.

**Architecture:** Three-tier template system (system → church → service instance). All liturgical text, eucharistic prayers, collects, and service structure stored in PostgreSQL. Hymn verses scraped from hymnary.org at build time. New service section editor replaces the current music-slot-only editor. Editable preview mirrors PDF layout with inline text editing.

**Tech Stack:** Next.js 16, Drizzle ORM 0.45.1, PostgreSQL (Supabase), React 19, @react-pdf/renderer, Tailwind CSS 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-03-26-service-editor-overhaul-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|------|---------------|
| `src/lib/db/schema-liturgy.ts` | New table definitions: `liturgicalTexts`, `serviceTypeTemplates`, `templateSections`, `churchTemplates`, `churchTemplateSections`, `serviceSections`, `eucharisticPrayers`, `collects`, `hymnVerses` |
| `src/lib/services/template-resolution.ts` | Pure function: resolve which template sections to copy for a new service |
| `src/lib/services/verse-selection.ts` | Pure function: select N verses from a hymn, preserving first and last |
| `src/lib/services/completeness.ts` | Pure function: calculate service completeness status |
| `src/lib/services/collect-resolution.ts` | Pure function: resolve collect text from override/collect_id/liturgical_day |
| `src/lib/services/__tests__/verse-selection.test.ts` | Unit tests for verse selection |
| `src/lib/services/__tests__/template-resolution.test.ts` | Unit tests for template resolution |
| `src/lib/services/__tests__/completeness.test.ts` | Unit tests for completeness calculation |
| `src/lib/services/__tests__/collect-resolution.test.ts` | Unit tests for collect resolution |
| `scripts/seed-liturgical-texts.ts` | Seed `liturgical_texts` from `src/data/liturgy/*.ts` |
| `scripts/seed-templates.ts` | Seed `service_type_templates` + `template_sections` |
| `scripts/seed-eucharistic-prayers.ts` | Seed `eucharistic_prayers` from liturgy data |
| `scripts/seed-collects.ts` | Seed `collects` from `liturgical_days.collect` + BCP |
| `scripts/scrape-hymn-text.ts` | Scrape hymn verses from hymnary.org |
| `src/app/api/churches/[churchId]/services/[serviceId]/sections/route.ts` | CRUD for service sections |
| `src/app/api/eucharistic-prayers/route.ts` | List all eucharistic prayers |
| `src/app/api/churches/[churchId]/collects/route.ts` | List collects for a liturgical day + church customs |
| `src/app/api/churches/[churchId]/templates/route.ts` | Church template CRUD |
| `src/app/api/churches/[churchId]/templates/[templateId]/sections/route.ts` | Church template sections CRUD |
| `src/app/(app)/churches/[churchId]/services/page.tsx` | Renamed from sundays/page.tsx |
| `src/app/(app)/churches/[churchId]/services/[date]/page.tsx` | Renamed from sundays/[date]/page.tsx |
| `src/app/(app)/churches/[churchId]/services/[date]/section-editor.tsx` | Running order editor component |
| `src/app/(app)/churches/[churchId]/services/[date]/section-row.tsx` | Single section row with contextual controls |
| `src/app/(app)/churches/[churchId]/services/[date]/add-section-picker.tsx` | Section type picker dialog |
| `src/app/(app)/churches/[churchId]/services/[date]/collect-chooser.tsx` | Inline collect CW/BCP/Custom selector |
| `src/app/(app)/churches/[churchId]/services/[date]/eucharistic-prayer-browser.tsx` | Slide-out prayer browser panel |
| `src/app/(app)/churches/[churchId]/services/[date]/verse-stepper.tsx` | +/− verse count control |
| `src/app/(app)/churches/[churchId]/services/[date]/verse-selector.tsx` | Manual verse checkbox picker |
| `src/app/(app)/churches/[churchId]/services/[date]/booklet-preview.tsx` | Editable booklet preview component |
| `src/app/(app)/churches/[churchId]/settings/templates/page.tsx` | Church template admin page |
| `src/app/(app)/churches/[churchId]/sundays/page.tsx` | Redirect to /services |

### Modified files

| Path | Changes |
|------|---------|
| `src/lib/db/schema.ts` | Import + re-export from `schema-liturgy.ts`; add new columns to `services` and `musicSlots` |
| `src/lib/pdf/build-sheet-data.ts` | Read from `service_sections` instead of hardcoded templates; resolve hymn verses; handle text overrides |
| `src/lib/pdf/booklet-document.tsx` | Accept new data shape with verse text and overrides |
| `src/lib/pdf/summary-document.tsx` | Accept new data shape |
| `src/lib/pdf/components/liturgical-section.tsx` | Update to render from DB-sourced blocks |
| `src/components/church-sidebar.tsx` | "Sundays" → "Services" label |
| `src/app/(app)/churches/[churchId]/layout.tsx` | Update nav items href |
| `src/app/(app)/churches/[churchId]/sundays/[date]/service-planner.tsx` | Replace music-slot-only editor with section editor; add delete service; integrate new components |
| `src/app/(app)/churches/[churchId]/sundays/[date]/service-settings.tsx` | Remove eucharistic prayer letter dropdown (moved to section editor) |
| `src/app/api/churches/[churchId]/services/route.ts` | On create: resolve template → copy sections; apply default verse count and eucharistic prayer |
| `src/app/api/churches/[churchId]/services/[serviceId]/route.ts` | Add DELETE handler; update PATCH for new fields |
| `src/app/api/churches/[churchId]/services/[serviceId]/sheet/route.ts` | Pass new data shape to PDF renderer |
| `drizzle.config.ts` | Ensure schema array includes new file |
| `package.json` | Add new seed/scrape scripts |

---

## Tasks

### Task 1: New database schema — enums and tables

**Files:**
- Create: `src/lib/db/schema-liturgy.ts`
- Modify: `src/lib/db/schema.ts` (add imports and re-exports; add columns to `services`, `musicSlots`)
- Modify: `drizzle.config.ts` (add schema-liturgy to schema array)

- [ ] **Step 1: Create the rite enum and liturgical_texts table**

In `src/lib/db/schema-liturgy.ts`:

```typescript
import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const riteEnum = pgEnum("rite", ["CW", "BCP", "COMMON", "CUSTOM"]);

export const liturgicalTexts = pgTable("liturgical_texts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  rite: riteEnum("rite").notNull(),
  category: text("category").notNull(),
  blocks: jsonb("blocks").notNull().$type<{ speaker: string; text: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add service_type_templates and template_sections tables**

Append to `src/lib/db/schema-liturgy.ts`:

```typescript
import { serviceTypeEnum, musicSlotTypeEnum } from "./schema";

export const serviceTypeTemplates = pgTable("service_type_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceType: serviceTypeEnum("service_type").notNull().unique(),
  rite: text("rite").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templateSections = pgTable("template_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull().references(() => serviceTypeTemplates.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  musicSlotType: musicSlotTypeEnum("music_slot_type"),
  placeholderType: text("placeholder_type"),
  optional: boolean("optional").default(false).notNull(),
  allowOverride: boolean("allow_override").default(false).notNull(),
});
```

- [ ] **Step 3: Add church_templates and church_template_sections tables**

Append to `src/lib/db/schema-liturgy.ts`:

```typescript
import { churches } from "./schema";

export const churchTemplates = pgTable("church_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  baseTemplateId: uuid("base_template_id").notNull().references(() => serviceTypeTemplates.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("church_template_unique").on(t.churchId, t.baseTemplateId),
]);

export const churchTemplateSections = pgTable("church_template_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchTemplateId: uuid("church_template_id").notNull().references(() => churchTemplates.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  musicSlotType: musicSlotTypeEnum("music_slot_type"),
  placeholderType: text("placeholder_type"),
  optional: boolean("optional").default(false).notNull(),
  allowOverride: boolean("allow_override").default(false).notNull(),
});
```

- [ ] **Step 4: Add service_sections table**

Append to `src/lib/db/schema-liturgy.ts`:

```typescript
import { services, musicSlots } from "./schema";

export const serviceSections = pgTable("service_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  textOverride: jsonb("text_override").$type<{ speaker: string; text: string }[] | null>(),
  musicSlotId: uuid("music_slot_id").references(() => musicSlots.id, { onDelete: "set null" }),
  placeholderType: text("placeholder_type"),
  placeholderValue: text("placeholder_value"),
  visible: boolean("visible").default(true).notNull(),
});
```

- [ ] **Step 5: Add eucharistic_prayers, collects, and hymn_verses tables**

Append to `src/lib/db/schema-liturgy.ts`:

```typescript
import { liturgicalDays, hymns } from "./schema";

export const eucharisticPrayers = pgTable("eucharistic_prayers", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  rite: riteEnum("rite").notNull(),
  description: text("description").notNull(),
  blocks: jsonb("blocks").notNull().$type<{ speaker: string; text: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collects = pgTable("collects", {
  id: uuid("id").primaryKey().defaultRandom(),
  liturgicalDayId: uuid("liturgical_day_id").references(() => liturgicalDays.id),
  rite: riteEnum("rite").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  churchId: uuid("church_id").references(() => churches.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hymnVerses = pgTable("hymn_verses", {
  id: uuid("id").primaryKey().defaultRandom(),
  hymnId: uuid("hymn_id").notNull().references(() => hymns.id, { onDelete: "cascade" }),
  verseNumber: integer("verse_number").notNull(),
  text: text("text").notNull(),
  isChorus: boolean("is_chorus").default(false).notNull(),
}, (t) => [
  uniqueIndex("hymn_verse_unique").on(t.hymnId, t.verseNumber),
]);
```

- [ ] **Step 6: Add new columns to services and musicSlots**

In `src/lib/db/schema.ts`, modify the `services` table to add:

```typescript
eucharisticPrayerId: uuid("eucharistic_prayer_id").references(() => eucharisticPrayers.id),
collectId: uuid("collect_id").references(() => collects.id),
collectOverride: text("collect_override"),
```

Modify `musicSlots` table to add:

```typescript
verseCount: integer("verse_count"),
selectedVerses: integer("selected_verses").array(),
```

Import the new tables from `schema-liturgy.ts` and re-export them.

- [ ] **Step 7: Update drizzle.config.ts**

Add `schema-liturgy.ts` to the schema array:

```typescript
export default defineConfig({
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/schema-liturgy.ts"],
  // ...
});
```

- [ ] **Step 8: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Review the generated SQL to ensure all tables and columns are created correctly.

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/schema-liturgy.ts src/lib/db/schema.ts drizzle.config.ts drizzle/
git commit -m "feat: add database schema for configurable service templates, liturgical texts, eucharistic prayers, collects, hymn verses"
```

---

### Task 2: Seed liturgical texts from TypeScript sources

**Files:**
- Create: `scripts/seed-liturgical-texts.ts`
- Read: `src/data/liturgy/shared.ts`, `src/data/liturgy/cw-eucharist-order-one.ts`, `src/data/liturgy/bcp-evensong.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write the seed script**

Create `scripts/seed-liturgical-texts.ts`. Read the existing liturgy TypeScript files and extract every `LiturgicalTextBlock[]` into a `liturgicalTexts` row. Use the existing `shared.ts` exports (NICENE_CREED, LORDS_PRAYER, CONFESSION, etc.) and the inline blocks from `cw-eucharist-order-one.ts` and `bcp-evensong.ts`.

Pattern to follow — see `scripts/seed-lectionary.ts` for the import/db pattern:

```typescript
import { db } from "@/lib/db";
import { liturgicalTexts } from "@/lib/db/schema-liturgy";

const TEXTS = [
  { key: "nicene-creed", title: "The Nicene Creed", rite: "COMMON", category: "creed", blocks: [...] },
  { key: "confession-cw", title: "Confession (CW)", rite: "CW", category: "confession", blocks: [...] },
  // ... extract all from shared.ts, cw-eucharist-order-one.ts, bcp-evensong.ts
];

async function main() {
  for (const text of TEXTS) {
    await db.insert(liturgicalTexts).values(text).onConflictDoUpdate({
      target: liturgicalTexts.key,
      set: { title: text.title, blocks: text.blocks, updatedAt: new Date() },
    });
  }
  console.log(`Seeded ${TEXTS.length} liturgical texts`);
}

main().catch(console.error).finally(() => process.exit());
```

- [ ] **Step 2: Add package.json script**

```json
"db:seed-texts": "tsx scripts/seed-liturgical-texts.ts"
```

- [ ] **Step 3: Run the seed and verify**

```bash
npm run db:seed-texts
```

Expected: "Seeded N liturgical texts" with no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-liturgical-texts.ts package.json
git commit -m "feat: add seed script for liturgical texts from TypeScript sources"
```

---

### Task 3: Seed service type templates and template sections

**Files:**
- Create: `scripts/seed-templates.ts`
- Read: `src/data/liturgy/cw-eucharist-order-one.ts`, `src/data/liturgy/bcp-evensong.ts`, `src/data/liturgy/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the seed script**

Create `scripts/seed-templates.ts`. For each existing `ServiceTemplate` (CW Eucharist Order One, BCP Evensong, and any others), create a `serviceTypeTemplates` row and corresponding `templateSections` rows that mirror the current hardcoded `LiturgicalSection[]` arrays.

Map each `LiturgicalSection` to a `templateSections` row:
- `section.id` → `sectionKey`
- `section.title` → `title`
- `section.majorSection` → `majorSection`
- Array index → `positionOrder`
- If section has static `blocks` → look up matching `liturgicalTexts` row by key, set `liturgicalTextId`
- `section.musicSlotType` → `musicSlotType`
- `section.placeholder` → `placeholderType`
- `section.optional` → `optional`
- `section.allowOverride` → `allowOverride`

- [ ] **Step 2: Add package.json script and run**

```json
"db:seed-templates": "tsx scripts/seed-templates.ts"
```

```bash
npm run db:seed-templates
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-templates.ts package.json
git commit -m "feat: add seed script for service type templates and sections"
```

---

### Task 4: Seed eucharistic prayers and collects

**Files:**
- Create: `scripts/seed-eucharistic-prayers.ts`
- Create: `scripts/seed-collects.ts`
- Read: `src/data/liturgy/eucharistic-prayers.ts`
- Modify: `package.json`

- [ ] **Step 1: Write eucharistic prayers seed**

Create `scripts/seed-eucharistic-prayers.ts`. Read the `EUCHARISTIC_PRAYERS` export from `src/data/liturgy/eucharistic-prayers.ts`. For each prayer (A through H), insert a row with key, name, rite ("CW"), description (brief summary of the prayer's character), and blocks.

Add a BCP Prayer of Consecration manually (not in the current codebase — use the 1662 text).

- [ ] **Step 2: Write collects seed**

Create `scripts/seed-collects.ts`. Query all `liturgicalDays` rows. For each day that has a `collect` value, insert a `collects` row with `rite: "CW"`, `liturgicalDayId`, and the text.

BCP collects: these need to be sourced separately. For the initial seed, insert CW collects only. BCP collects can be added in a follow-up data task.

- [ ] **Step 3: Add scripts and run**

```json
"db:seed-prayers": "tsx scripts/seed-eucharistic-prayers.ts",
"db:seed-collects": "tsx scripts/seed-collects.ts"
```

```bash
npm run db:seed-prayers && npm run db:seed-collects
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-eucharistic-prayers.ts scripts/seed-collects.ts package.json
git commit -m "feat: add seed scripts for eucharistic prayers and collects"
```

---

### Task 5: Hymn text scraper

**Files:**
- Create: `scripts/scrape-hymn-text.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the scraper**

Create `scripts/scrape-hymn-text.ts`. Follow the pattern of `scripts/scrape-readings-text.ts`:

```typescript
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { hymns, hymnVerses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const HYMNAL_CODES: Record<string, string> = {
  NEH: "NEH1985",
  AM: "AM2013",
};

async function scrapeHymn(book: string, number: number): Promise<{ verses: { number: number; text: string; isChorus: boolean }[] } | null> {
  const code = HYMNAL_CODES[book];
  const url = `https://hymnary.org/hymn/${code}/${number}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);
  // Parse "Full Text" section — split into numbered stanzas
  // Identify refrains/choruses (marked "Refrain", "Chorus", or unnumbered repeating stanzas)
  // Return verse array
}

async function main() {
  const allHymns = await db.select().from(hymns);
  let scraped = 0, failed = 0;

  for (const hymn of allHymns) {
    const result = await scrapeHymn(hymn.book, hymn.number);
    if (!result) { failed++; console.warn(`No text found: ${hymn.book} ${hymn.number}`); continue; }

    for (const verse of result.verses) {
      await db.insert(hymnVerses).values({
        hymnId: hymn.id,
        verseNumber: verse.number,
        text: verse.text,
        isChorus: verse.isChorus,
      }).onConflictDoUpdate({
        target: [hymnVerses.hymnId, hymnVerses.verseNumber],
        set: { text: verse.text, isChorus: verse.isChorus },
      });
    }
    scraped++;
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  console.log(`Scraped ${scraped} hymns, ${failed} failed`);
}

main().catch(console.error).finally(() => process.exit());
```

- [ ] **Step 2: Add script and run**

```json
"db:scrape-hymns": "tsx scripts/scrape-hymn-text.ts"
```

```bash
npm run db:scrape-hymns
```

This will take several minutes (hundreds of hymns, 300ms between requests). Check output for failures.

- [ ] **Step 3: Commit**

```bash
git add scripts/scrape-hymn-text.ts package.json
git commit -m "feat: add build-time hymn text scraper from hymnary.org"
```

---

### Task 6: Core business logic — verse selection

**Files:**
- Create: `src/lib/services/verse-selection.ts`
- Create: `src/lib/services/__tests__/verse-selection.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/services/__tests__/verse-selection.test.ts
import { describe, it, expect } from "vitest";
import { selectVerses } from "../verse-selection";

describe("selectVerses", () => {
  it("returns all verses when count >= total", () => {
    expect(selectVerses(4, 4)).toEqual([1, 2, 3, 4]);
  });

  it("returns all verses when count > total", () => {
    expect(selectVerses(3, 5)).toEqual([1, 2, 3]);
  });

  it("preserves first and last, evenly spaces middle (7 total, 4 requested)", () => {
    expect(selectVerses(7, 4)).toEqual([1, 3, 5, 7]);
  });

  it("preserves first and last only (8 total, 2 requested)", () => {
    expect(selectVerses(8, 2)).toEqual([1, 8]);
  });

  it("handles 6 total, 3 requested", () => {
    expect(selectVerses(6, 3)).toEqual([1, 3, 6]);
  });

  it("returns [1] when count is 1", () => {
    expect(selectVerses(5, 1)).toEqual([1]);
  });

  it("respects explicit selected_verses override", () => {
    expect(selectVerses(7, 4, [1, 2, 5, 7])).toEqual([1, 2, 5, 7]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/services/__tests__/verse-selection.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement verse-selection.ts**

```typescript
// src/lib/services/verse-selection.ts

/**
 * Select which verse numbers to include for a hymn.
 * Always preserves first and last verse, evenly spacing the middle.
 * Choruses/refrains are handled separately (they appear after each selected verse).
 */
export function selectVerses(
  totalVerses: number,
  requestedCount: number,
  explicitSelection?: number[] | null,
): number[] {
  if (explicitSelection && explicitSelection.length > 0) {
    return explicitSelection;
  }

  if (requestedCount >= totalVerses) {
    return Array.from({ length: totalVerses }, (_, i) => i + 1);
  }

  if (requestedCount <= 0) return [];
  if (requestedCount === 1) return [1];

  const result: number[] = [1];
  const remaining = requestedCount - 2; // minus first and last

  if (remaining > 0) {
    const step = (totalVerses - 1) / (requestedCount - 1);
    for (let i = 1; i <= remaining; i++) {
      result.push(Math.round(1 + i * step));
    }
  }

  result.push(totalVerses);
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/services/__tests__/verse-selection.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/verse-selection.ts src/lib/services/__tests__/verse-selection.test.ts
git commit -m "feat: add verse selection algorithm with first/last preservation"
```

---

### Task 7: Core business logic — template resolution

**Files:**
- Create: `src/lib/services/template-resolution.ts`
- Create: `src/lib/services/__tests__/template-resolution.test.ts`

- [ ] **Step 1: Write failing tests**

Test the pure logic: given a service type and church ID, determine which template sections to copy. Mock the DB queries. Test cases:
- No church template → returns system template sections
- Church template exists → returns church template sections
- Correct ordering preserved

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/services/__tests__/template-resolution.test.ts
```

- [ ] **Step 3: Implement template-resolution.ts**

```typescript
// src/lib/services/template-resolution.ts
import { db } from "@/lib/db";
import { churchTemplates, churchTemplateSections, serviceTypeTemplates, templateSections } from "@/lib/db/schema-liturgy";
import { eq, and, asc } from "drizzle-orm";

export interface ResolvedSection {
  sectionKey: string;
  title: string;
  majorSection: string | null;
  positionOrder: number;
  liturgicalTextId: string | null;
  musicSlotType: string | null;
  placeholderType: string | null;
  optional: boolean;
  allowOverride: boolean;
}

export async function resolveTemplateSections(
  churchId: string,
  serviceType: string,
): Promise<ResolvedSection[]> {
  // 1. Find the system template for this service type
  const [systemTemplate] = await db.select()
    .from(serviceTypeTemplates)
    .where(eq(serviceTypeTemplates.serviceType, serviceType));
  if (!systemTemplate) return [];

  // 2. Check for church-specific override
  const [churchTemplate] = await db.select()
    .from(churchTemplates)
    .where(and(
      eq(churchTemplates.churchId, churchId),
      eq(churchTemplates.baseTemplateId, systemTemplate.id),
    ));

  // 3. Return church sections if exists, else system sections
  if (churchTemplate) {
    return db.select()
      .from(churchTemplateSections)
      .where(eq(churchTemplateSections.churchTemplateId, churchTemplate.id))
      .orderBy(asc(churchTemplateSections.positionOrder));
  }

  return db.select()
    .from(templateSections)
    .where(eq(templateSections.templateId, systemTemplate.id))
    .orderBy(asc(templateSections.positionOrder));
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/template-resolution.ts src/lib/services/__tests__/template-resolution.test.ts
git commit -m "feat: add template resolution (system → church → service)"
```

---

### Task 8: Core business logic — completeness and collect resolution

**Files:**
- Create: `src/lib/services/completeness.ts`
- Create: `src/lib/services/collect-resolution.ts`
- Create: `src/lib/services/__tests__/completeness.test.ts`
- Create: `src/lib/services/__tests__/collect-resolution.test.ts`

- [ ] **Step 1: Write failing tests for completeness**

Test cases:
- All music slots filled + eucharistic prayer set → "complete"
- Some filled → "partial"
- Nothing filled → "empty"
- Non-eucharist service (no prayer needed) → complete when music filled

- [ ] **Step 2: Implement completeness.ts**

```typescript
export type CompletenessStatus = "complete" | "partial" | "empty";

export function calculateCompleteness(sections: {
  musicSlotType: string | null;
  musicSlotId: string | null;
  placeholderType: string | null;
  placeholderValue: string | null;
  visible: boolean;
}[]): CompletenessStatus {
  const visibleSections = sections.filter(s => s.visible);
  const musicSections = visibleSections.filter(s => s.musicSlotType);
  const filledMusic = musicSections.filter(s => s.musicSlotId);
  const placeholders = visibleSections.filter(s => s.placeholderType);
  const resolvedPlaceholders = placeholders.filter(s => s.placeholderValue);

  const total = musicSections.length + placeholders.length;
  const filled = filledMusic.length + resolvedPlaceholders.length;

  if (total === 0) return "empty";
  if (filled === 0) return "empty";
  if (filled === total) return "complete";
  return "partial";
}
```

- [ ] **Step 3: Write failing tests for collect resolution**

Test cases:
- collect_override set → use override text
- collect_id set → look up from collects table
- Neither set → use liturgical day default

- [ ] **Step 4: Implement collect-resolution.ts**

- [ ] **Step 5: Run all tests**

```bash
npx vitest run src/lib/services/__tests__/
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/completeness.ts src/lib/services/collect-resolution.ts src/lib/services/__tests__/
git commit -m "feat: add service completeness calculation and collect resolution"
```

---

### Task 9: API routes — eucharistic prayers and collects

**Files:**
- Create: `src/app/api/eucharistic-prayers/route.ts`
- Create: `src/app/api/churches/[churchId]/collects/route.ts`

- [ ] **Step 1: Create eucharistic prayers endpoint**

`GET /api/eucharistic-prayers` — returns all prayers (no auth required for listing, since it's reference data).

```typescript
import { db } from "@/lib/db";
import { eucharisticPrayers } from "@/lib/db/schema-liturgy";
import { NextResponse } from "next/server";

export async function GET() {
  const prayers = await db.select().from(eucharisticPrayers);
  return NextResponse.json(prayers);
}
```

- [ ] **Step 2: Create collects endpoint**

`GET /api/churches/[churchId]/collects?liturgicalDayId=xxx` — returns CW, BCP, and custom collects for a liturgical day.

```typescript
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { collects } from "@/lib/db/schema-liturgy";
import { eq, and, or, isNull } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: { churchId: string } }) {
  const { churchId } = await params;
  await requireChurchRole(churchId, "MEMBER");

  const url = new URL(request.url);
  const liturgicalDayId = url.searchParams.get("liturgicalDayId");

  const results = await db.select().from(collects).where(
    and(
      liturgicalDayId ? eq(collects.liturgicalDayId, liturgicalDayId) : undefined,
      or(isNull(collects.churchId), eq(collects.churchId, churchId)),
    ),
  );

  return NextResponse.json(results);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/eucharistic-prayers/ src/app/api/churches/\[churchId\]/collects/
git commit -m "feat: add API routes for eucharistic prayers and collects"
```

---

### Task 10: API routes — service sections CRUD

**Files:**
- Create: `src/app/api/churches/[churchId]/services/[serviceId]/sections/route.ts`
- Modify: `src/app/api/churches/[churchId]/services/route.ts` (create service → copy template sections)
- Modify: `src/app/api/churches/[churchId]/services/[serviceId]/route.ts` (add DELETE, update PATCH)

- [ ] **Step 1: Create sections GET/PUT endpoint**

`GET` returns all `service_sections` for a service, ordered by `position_order`.
`PUT` replaces all sections (full rewrite on reorder/add/delete).

- [ ] **Step 2: Update service creation to copy template sections**

In the POST handler for services, after creating the service row:
1. Call `resolveTemplateSections(churchId, serviceType)`
2. Insert `service_sections` rows from the resolved template
3. For each section with `musicSlotType`, create a corresponding `music_slot` row and link it via `musicSlotId`
4. Apply `churches.settings.default_verse_count` and `default_eucharistic_prayer_id` if set

- [ ] **Step 3: Add DELETE handler for services**

In `src/app/api/churches/[churchId]/services/[serviceId]/route.ts`, add:

```typescript
export async function DELETE(request: Request, { params }: { params: { churchId: string; serviceId: string } }) {
  const { churchId, serviceId } = await params;
  await requireChurchRole(churchId, "EDITOR");

  await db.delete(services).where(
    and(eq(services.id, serviceId), eq(services.churchId, churchId)),
  );

  return NextResponse.json({ success: true });
}
```

Cascading deletes handle `service_sections` and `music_slots`.

- [ ] **Step 4: Update PATCH to handle new fields**

Add `eucharisticPrayerId`, `collectId`, `collectOverride` to the PATCH handler's accepted fields.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/churches/\[churchId\]/services/
git commit -m "feat: add service sections CRUD, service delete, template-based service creation"
```

---

### Task 11: API routes — church templates

**Files:**
- Create: `src/app/api/churches/[churchId]/templates/route.ts`
- Create: `src/app/api/churches/[churchId]/templates/[templateId]/sections/route.ts`

- [ ] **Step 1: Create church templates list/create endpoint**

`GET` lists all church templates (with their base template info).
`POST` creates a new church template by copying sections from the system template. Requires ADMIN role.

- [ ] **Step 2: Create template sections endpoint**

`GET` returns sections for a church template.
`PUT` replaces all sections (full rewrite on edit).
`DELETE` on the parent template resets to system default.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/churches/\[churchId\]/templates/
git commit -m "feat: add church template CRUD API routes"
```

---

### Task 12: Route rename — Sundays → Services

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/page.tsx` (copy + rename from sundays)
- Create: `src/app/(app)/churches/[churchId]/services/[date]/page.tsx` (copy + rename)
- Create: `src/app/(app)/churches/[churchId]/sundays/page.tsx` (redirect)
- Modify: `src/components/church-sidebar.tsx`
- Modify: `src/app/(app)/churches/[churchId]/layout.tsx`

- [ ] **Step 1: Copy sundays pages to services directory**

```bash
cp -r src/app/\(app\)/churches/\[churchId\]/sundays/ src/app/\(app\)/churches/\[churchId\]/services/
```

Update all internal references from "sundays" to "services" in the copied files:
- Page titles: "Sundays" → "Services"
- Internal links: `/sundays/` → `/services/`
- Breadcrumbs

- [ ] **Step 2: Replace sundays/page.tsx with redirect**

```typescript
import { redirect } from "next/navigation";

export default function SundaysRedirect({ params }: { params: { churchId: string } }) {
  redirect(`/churches/${params.churchId}/services`);
}
```

Do the same for `sundays/[date]/page.tsx`.

- [ ] **Step 3: Update sidebar and layout**

In `src/app/(app)/churches/[churchId]/layout.tsx`, change the nav item:
```typescript
{ href: `/churches/${churchId}/services`, label: "Services", iconName: "Calendar" },
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/churches/ src/components/church-sidebar.tsx
git commit -m "feat: rename Sundays to Services — routes, sidebar, page titles"
```

---

### Task 13: Service section editor UI

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/[date]/section-editor.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/[date]/section-row.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/[date]/add-section-picker.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/service-planner.tsx`

- [ ] **Step 1: Build section-row.tsx**

A single row in the running order. Props:
- `section`: service section data
- `onDelete`, `onToggleVisible`, `onMove`
- Contextual child components (verse stepper, collect chooser, etc.)

Uses existing design system: `border-border`, `bg-card`, `text-foreground`, 2px radius, Libre Baskerville body text. Each row has:
- Drag handle (⠿ icon)
- Type icon (colour-coded by type)
- Title + content summary
- Inline controls (contextual)
- Show/hide toggle
- Delete button (destructive colour)

- [ ] **Step 2: Build section-editor.tsx**

Container component. Fetches `service_sections` from API. Renders:
- Major section headers (THE GATHERING, etc.) as styled dividers
- `section-row` for each section
- Drag-and-drop reorder (use `@dnd-kit/core` or native HTML drag API)
- Saves reordered sections via PUT to `/api/.../sections`
- "+ Add section" button at bottom

- [ ] **Step 3: Build add-section-picker.tsx**

Dialog with category buttons: Hymn, Liturgical Text, Reading, Custom Text, Restore Removed.

- Hymn → creates a new `service_section` with `musicSlotType: "HYMN"` + new `music_slot`
- Liturgical Text → fetches from `liturgical_texts`, user picks one → creates section with `liturgicalTextId`
- Reading → creates section with `placeholderType: "reading-custom"`
- Custom Text → creates section with `textOverride` set to user input
- Restore Removed → shows sections from base template that are missing from current service

- [ ] **Step 4: Integrate into service-planner.tsx**

Replace the `MusicSlotEditor` component with `SectionEditor`. The `MusicSlotEditor` is no longer needed — music slots are now managed as part of service sections.

Keep `ServiceSettings` but remove the eucharistic prayer dropdown (it's now in the section editor via the prayer browser).

Add "Delete service" button to service settings.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/\[date\]/
git commit -m "feat: add service section editor with drag reorder, add, delete, hide"
```

---

### Task 14: Collect chooser, eucharistic prayer browser, verse controls

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/[date]/collect-chooser.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/[date]/eucharistic-prayer-browser.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/[date]/verse-stepper.tsx`
- Create: `src/app/(app)/churches/[churchId]/services/[date]/verse-selector.tsx`

- [ ] **Step 1: Build collect-chooser.tsx**

Inline component rendered inside a section row when `placeholderType === "collect"`.
- Select dropdown: CW / BCP / Custom
- CW and BCP options fetched from `/api/churches/{churchId}/collects?liturgicalDayId=xxx`
- Custom shows an inline textarea
- On change, PATCHes the service's `collectId` or `collectOverride`
- Shows preview of the selected collect text below the dropdown

- [ ] **Step 2: Build eucharistic-prayer-browser.tsx**

Slide-out panel (use shadcn Sheet component). Rendered when user clicks "Browse prayers" on the eucharistic prayer section row.
- Fetches from `GET /api/eucharistic-prayers`
- Lists each prayer with name, rite badge, description
- "Preview full text" expander (use shadcn Collapsible)
- Currently selected prayer highlighted
- On click: PATCHes `services.eucharisticPrayerId`, closes panel

- [ ] **Step 3: Build verse-stepper.tsx**

Inline component rendered inside a section row when `musicSlotType === "HYMN"` and a hymn is assigned.
- Shows "X of Y verses"
- +/− buttons to adjust `verse_count` on the music slot
- PATCHes `music_slots.verse_count` via API
- Min: 1, Max: total verse count for the hymn

- [ ] **Step 4: Build verse-selector.tsx**

Dialog opened via "Select verses" link on hymn rows.
- Fetches hymn verses from DB (new endpoint: `GET /api/hymns/{hymnId}/verses`)
- Shows checklist with verse number + text preview
- Choruses/refrains shown but not toggleable (always included)
- On save: PATCHes `music_slots.selected_verses` array

- [ ] **Step 5: Add hymn verses API endpoint**

Create `src/app/api/hymns/[hymnId]/verses/route.ts`:
```typescript
export async function GET(request: Request, { params }: { params: { hymnId: string } }) {
  const { hymnId } = await params;
  const verses = await db.select().from(hymnVerses)
    .where(eq(hymnVerses.hymnId, hymnId))
    .orderBy(asc(hymnVerses.verseNumber));
  return NextResponse.json(verses);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/\[date\]/ src/app/api/hymns/
git commit -m "feat: add collect chooser, eucharistic prayer browser, verse stepper and selector"
```

---

### Task 15: Update build-sheet-data and PDF rendering

**Files:**
- Modify: `src/lib/pdf/build-sheet-data.ts`
- Modify: `src/lib/pdf/booklet-document.tsx`
- Modify: `src/lib/pdf/summary-document.tsx`
- Modify: `src/lib/pdf/components/liturgical-section.tsx`
- Modify: `src/app/api/churches/[churchId]/services/[serviceId]/sheet/route.ts`

- [ ] **Step 1: Refactor build-sheet-data.ts**

Replace the hardcoded template lookup (`SERVICE_TYPE_TO_TEMPLATE`) with a query to `service_sections`:

```typescript
// Old: const template = resolveServiceTemplate(serviceType);
// New: query service_sections for this service, ordered by position_order
const sections = await db.select()
  .from(serviceSections)
  .where(eq(serviceSections.serviceId, serviceId))
  .orderBy(asc(serviceSections.positionOrder));
```

For each section:
- If `textOverride` is set → use it
- If `liturgicalTextId` is set → join to `liturgicalTexts` to get blocks
- If `musicSlotId` is set → join to `musicSlots` → resolve hymn, anthem, etc.
- If `placeholderType` is set → resolve collect, reading, eucharistic prayer
- For hymn slots → call `selectVerses()` to get the right verses from `hymnVerses`

- [ ] **Step 2: Update booklet-document.tsx**

Accept the new data shape where each section includes resolved text blocks (from DB), hymn verse text, and override indicators.

- [ ] **Step 3: Update liturgical-section.tsx PDF component**

Render from the new `blocks` format sourced from DB instead of the old TypeScript template format.

- [ ] **Step 4: Fix readings spacing**

In the booklet PDF renderer, increase:
- `paddingLeft` on reading text from `8` to `16`
- `lineHeight` on reading text from current to `1.6`
- `marginBottom` between consecutive readings from `0` to `8`

In the web reading display (`services/[date]/page.tsx`):
- Increase gap between position label and reference
- Add `border-b border-border` between readings
- Increase text `leading-relaxed` for reading content

- [ ] **Step 5: Run existing PDF tests**

```bash
npx vitest run src/lib/pdf/__tests__/
```

Fix any breaking tests due to the new data shape.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf/ src/app/api/churches/\[churchId\]/services/\[serviceId\]/sheet/
git commit -m "feat: refactor PDF rendering to use DB-driven service sections with verse text and overrides"
```

---

### Task 16: Editable booklet preview

**Files:**
- Create: `src/app/(app)/churches/[churchId]/services/[date]/booklet-preview.tsx`
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/page.tsx` (add preview route/panel)

- [ ] **Step 1: Build booklet-preview.tsx**

React component that mirrors the PDF layout but renders in the browser with inline editing:

- Uses the same data pipeline as `build-sheet-data.ts` (via a new server action or API endpoint that returns the resolved sheet data as JSON)
- Renders with heading hierarchy, speaker attribution (italic for rubrics, bold for "All"), section headers
- Uses the church's sheet template settings for font and accent colour
- Each text block wrapped in a clickable container
- On click → switches to `contentEditable` or textarea
- On blur → PATCHes `service_sections.text_override` via API
- Overridden blocks show a coloured border and "Reset to default" link
- "Export PDF" and "Export DOCX" buttons at the top

- [ ] **Step 2: Add sheet data JSON endpoint**

Create or modify the sheet route to support `?format=json`:

```typescript
// In sheet/route.ts, add:
if (format === "json") {
  const data = sheetMode === "booklet"
    ? await buildBookletData(serviceId, churchId)
    : await buildSummaryData(serviceId, churchId);
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Add "Preview & Edit" button to service page**

In the service detail page, add a button that opens the booklet preview (as a full-width panel or route).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/\[date\]/booklet-preview.tsx src/app/api/
git commit -m "feat: add editable booklet preview with inline text editing and override tracking"
```

---

### Task 17: Church template admin page

**Files:**
- Create: `src/app/(app)/churches/[churchId]/settings/templates/page.tsx`
- Modify: `src/app/(app)/churches/[churchId]/layout.tsx` (add nav item for admin)

- [ ] **Step 1: Build templates admin page**

Page shows all service types. For each:
- Shows whether the church has a custom template or uses system default
- Click to expand → shows the section list (same `SectionEditor` component used in the service editor, but operating on `church_template_sections` instead of `service_sections`)
- "Reset to default" button deletes the `church_templates` row

- [ ] **Step 2: Add nav item**

In the church layout, add a "Templates" link under Settings (admin only):

```typescript
{ href: `/churches/${churchId}/settings/templates`, label: "Templates", iconName: "Layout" },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/settings/templates/ src/app/\(app\)/churches/\[churchId\]/layout.tsx
git commit -m "feat: add church template admin page for customising default service structures"
```

---

### Task 18: Service completeness indicators

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/page.tsx`

- [ ] **Step 1: Add completeness query**

When listing services on the services page, join to `service_sections` and compute completeness using the `calculateCompleteness()` function from Task 8.

- [ ] **Step 2: Render status dots**

On each service card, show a coloured dot:
- Green (`bg-secondary`) for complete
- Amber (`bg-warning`) for partial
- Grey (`bg-muted`) for empty

Use a `Badge` component with the appropriate variant.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/page.tsx
git commit -m "feat: add service completeness indicators (green/amber/grey dots)"
```

---

### Task 19: Save/feedback patterns and mobile responsiveness

**Files:**
- Modify: Multiple components across the app

- [ ] **Step 1: Add loading state to all save buttons**

In `section-editor.tsx`, `service-settings.tsx`, `collect-chooser.tsx`, and other components that save:
- Add `saving` state
- Show spinner icon + disabled state during save
- Show brief "Saved" text on success, inline next to the button

Pattern:
```typescript
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    await fetch(...);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 2: Add inline error messages**

Replace generic toast errors with inline error text next to the failing control.

- [ ] **Step 3: Mobile responsiveness for section editor**

Add responsive Tailwind classes to `section-row.tsx`:
- Desktop: horizontal flex row (as designed)
- Mobile (`md:` breakpoint): stack vertically — title on top, content summary, action icons as bottom row

```typescript
<div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 p-3 border-b border-border">
  {/* ... */}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ src/components/
git commit -m "feat: add consistent save feedback, inline errors, and mobile responsive section editor"
```

---

### Task 20: Data migration for existing services

**Files:**
- Create: `scripts/migrate-existing-services.ts`
- Modify: `package.json`

- [ ] **Step 1: Write migration script**

For each existing service:
1. Resolve its service type to a system template
2. Copy `template_sections` into new `service_sections` rows
3. Link existing `music_slots` to the appropriate `service_sections` by matching `musicSlotType`
4. Migrate `services.eucharistic_prayer` letter to `eucharistic_prayer_id` FK (look up in `eucharistic_prayers` by key like `cw-${letter.toLowerCase()}`)
5. Log any services that couldn't be fully migrated

```typescript
async function main() {
  const allServices = await db.select().from(services);
  for (const service of allServices) {
    // Check if service already has sections (idempotent)
    const existing = await db.select().from(serviceSections)
      .where(eq(serviceSections.serviceId, service.id));
    if (existing.length > 0) continue;

    // Resolve template and copy sections
    const sections = await resolveTemplateSections(service.churchId, service.serviceType);
    // Insert service_sections, link music_slots
    // Migrate eucharistic prayer
  }
}
```

- [ ] **Step 2: Add script and run**

```json
"db:migrate-services": "tsx scripts/migrate-existing-services.ts"
```

```bash
npm run db:migrate-services
```

- [ ] **Step 3: Verify migration**

Spot-check a few services in the database to confirm `service_sections` were created and `music_slots` are linked.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-existing-services.ts package.json
git commit -m "feat: add migration script to create service_sections for existing services"
```

---

### Task 21: Remove old code and final cleanup

**Files:**
- Delete: `src/data/liturgy/cw-eucharist-order-one.ts` (data now in DB)
- Delete: `src/data/liturgy/bcp-evensong.ts` (data now in DB)
- Delete: `src/data/liturgy/eucharistic-prayers.ts` (data now in DB)
- Delete: `src/data/liturgy/types.ts` (types no longer needed — replaced by DB schema types)
- Delete: `src/app/(app)/churches/[churchId]/sundays/[date]/music-slot-editor.tsx` (replaced by section-editor)
- Modify: `src/lib/pdf/build-sheet-data.ts` (remove imports of old liturgy files)
- Delete: old liturgy tests that test hardcoded data

- [ ] **Step 1: Remove old liturgy TypeScript files**

Keep `shared.ts` only if it contains utility functions used elsewhere. If it only contains data constants, delete it too.

- [ ] **Step 2: Remove music-slot-editor.tsx**

This component is fully replaced by the section editor.

- [ ] **Step 3: Clean up imports**

Search the codebase for any remaining imports from the deleted files. Update or remove them.

```bash
npx vitest run
npx tsc --noEmit
```

Fix any type errors or missing imports.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
npm run typecheck
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old hardcoded liturgy templates and music slot editor (replaced by DB-driven system)"
```

---

### Task 22: PDF preview overlay

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/services/[date]/page.tsx`
- Read: `src/app/api/churches/[churchId]/services/[serviceId]/sheet/route.ts`

- [ ] **Step 1: Add preview overlay**

On the service detail page, add a "Preview PDF" button that:
1. Fetches the PDF as a blob from the sheet endpoint
2. Opens it in an overlay using an `<iframe>` or `<object>` with `type="application/pdf"`
3. Shows "Download PDF" and "Download DOCX" buttons on the overlay
4. Shows "Edit" button that navigates to the booklet-preview component

Use shadcn Dialog (fullscreen variant) for the overlay.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/churches/\[churchId\]/services/
git commit -m "feat: add PDF preview overlay with download and edit buttons"
```

---

### Task 23: E2E tests

**Files:**
- Create: `e2e/service-editor.spec.ts`

- [ ] **Step 1: Write core E2E test**

Test the full flow:
1. Navigate to services page
2. Open a service
3. Verify section editor renders with expected sections
4. Reorder a section (drag or keyboard)
5. Hide a section
6. Delete a section
7. Add a hymn section
8. Set verse count
9. Choose a collect (CW → BCP → Custom)
10. Browse and select a eucharistic prayer
11. Preview the booklet
12. Edit text in the preview
13. Export PDF

- [ ] **Step 2: Run E2E tests**

```bash
npm run test:e2e
```

- [ ] **Step 3: Commit**

```bash
git add e2e/
git commit -m "test: add E2E tests for service section editor flow"
```

---

## Dependency Graph

```
Task 1 (Schema)
  ├── Task 2 (Seed liturgical texts)
  ├── Task 3 (Seed templates)
  ├── Task 4 (Seed prayers + collects)
  ├── Task 5 (Hymn scraper)
  ├── Task 6 (Verse selection logic) ← no DB dependency, pure function
  ├── Task 7 (Template resolution logic)
  └── Task 8 (Completeness + collect logic)

Tasks 2-4 (Seeds) + Task 7 (Resolution)
  └── Task 10 (Service sections API) + Task 9 (Prayers/collects API)

Task 10 (Sections API)
  └── Task 12 (Route rename) ← can run in parallel with 13
  └── Task 13 (Section editor UI)

Task 13 (Section editor) + Task 9 (APIs)
  └── Task 14 (Collect chooser, prayer browser, verse controls)

Task 14 (UI controls) + Task 5 (Hymn text) + Task 6 (Verse selection)
  └── Task 15 (PDF refactor)

Task 15 (PDF refactor)
  └── Task 16 (Editable preview)
  └── Task 22 (PDF preview overlay)

Task 11 (Church templates API)
  └── Task 17 (Template admin page)

Task 8 (Completeness)
  └── Task 18 (Completeness indicators)

Tasks 13-18 complete
  └── Task 19 (Save feedback + mobile)
  └── Task 20 (Data migration)
  └── Task 21 (Cleanup)
  └── Task 23 (E2E tests)
```

**Parallelisable groups:**
- Tasks 2, 3, 4, 5, 6, 8 can all run in parallel after Task 1
- Tasks 9, 10, 11 can run in parallel after seeds complete
- Tasks 12, 13 can run in parallel
- Tasks 17, 18 are independent of the main editor track
