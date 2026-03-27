# Service Editor Overhaul — Design Spec

**Date:** 2026-03-26
**Status:** Draft
**Scope:** 18 features — configurable service templates, hymn text/verse control, liturgical choosers, editable booklet preview, UI/UX improvements

---

## 1. Overview

This spec redesigns the service planning and booklet generation system. The current architecture uses hardcoded TypeScript templates for liturgical structure, has no hymn text, and offers no preview or customisation of the PDF output. This overhaul moves all liturgical data into the database, makes service structure fully configurable per church, adds hymn verse text from hymnary.org, and introduces an editable booklet preview before export.

### Feature list

| # | Feature | Section |
|---|---------|---------|
| 1 | Hymn text scraping from hymnary.org | §4 |
| 2 | Rename "Sundays" to "Services" | §6.1 |
| 3 | Custom service component slots (add/delete within liturgical framework) | §3 |
| 4 | Default component templates per service type, per church | §3 |
| 5 | Collect chooser (CW, BCP, or custom) | §3.4 |
| 6 | Eucharistic prayer browser with descriptions + non-CW options | §3.5 |
| 7 | All services customisable | §3 |
| 8 | Hymn verse control (choose count, preserve first & last) | §4.2 |
| 9 | Default hymn verse count setting | §4.3 |
| 10 | Editable booklet preview before export | §5 |
| 11 | Readings box spacing fix | §6.2 |
| 12 | Delete services and music slots | §3.3 |
| 13 | Reorder music slots / service sections | §3.3 |
| 14 | Readings override | §6.7 |
| 15 | Service completeness indicators | §6.3 |
| 16 | Better save/feedback patterns | §6.4 |
| 17 | PDF preview before download | §6.5 |
| 18 | Mobile responsiveness of service editor | §6.6 |

---

## 2. Data Model

All liturgical text, service structure, eucharistic prayers, collects, and hymn verses move from code to database. The system uses a three-tier template resolution: system defaults → church customisation → service instance.

**Primary key convention:** All new tables use `uuid` primary keys to match the existing schema. Foreign keys referencing existing tables (e.g., `hymns.id`, `churches.id`, `services.id`) are `uuid` type.

### 2.1 New tables

#### `liturgical_texts`

Stores every shared liturgical text: creeds, confessions, responses, rubrics, greetings, blessings.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `key` | text UNIQUE | e.g. `nicene-creed`, `confession-cw`, `lords-prayer` |
| `title` | text | Human-readable name |
| `rite` | enum(`CW`, `BCP`, `COMMON`) | Which tradition the text belongs to |
| `category` | text | Grouping: `creed`, `confession`, `prayer`, `rubric`, `greeting`, `blessing` |
| `blocks` | jsonb | `[{speaker: "all"|"president"|"reader"|"deacon"|"rubric", text: "..."}]` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Seeded from the current TypeScript files in `src/data/liturgy/` — `shared.ts`, `cw-eucharist-order-one.ts`, `bcp-evensong.ts`.

#### `service_type_templates`

System-wide default template definitions. One row per service type.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `service_type` | enum | `SUNG_EUCHARIST`, `CHORAL_EVENSONG`, `SAID_EUCHARIST`, `CHORAL_MATINS`, `FAMILY_SERVICE`, `COMPLINE`, `CUSTOM` |
| `rite` | text | e.g. `Common Worship Order One`, `BCP Evensong` |
| `name` | text | Human-readable name |
| `description` | text nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Seeded from the current hardcoded `ServiceTemplate` definitions.

#### `template_sections`

Ordered list of sections within a system template. Each row is one element in the service running order.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `template_id` | FK → `service_type_templates.id` | |
| `section_key` | text | e.g. `entrance-hymn`, `gloria`, `collect`, `gospel-reading` |
| `title` | text | Display name: `Entrance Hymn`, `Gloria in Excelsis` |
| `major_section` | text nullable | Section divider: `THE GATHERING`, `LITURGY OF THE WORD`, etc. |
| `position_order` | integer | Ordering within the template |
| `liturgical_text_id` | FK → `liturgical_texts.id` nullable | For sections with fixed text (creed, confession, etc.) |
| `music_slot_type` | enum nullable | `HYMN`, `ANTHEM`, `MASS_SETTING_GLORIA`, `ORGAN_VOLUNTARY`, etc. |
| `placeholder_type` | text nullable | `collect`, `reading-ot`, `reading-psalm`, `reading-epistle`, `reading-gospel`, `eucharistic-prayer`, `sermon`, `post-communion` |
| `optional` | boolean default false | Whether this section can be hidden/omitted |
| `allow_override` | boolean default false | Whether text can be edited per service |

#### `church_templates`

Church-specific override of a system template. Created lazily — only exists when a church customises their defaults.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `church_id` | FK → `churches.id` ON DELETE CASCADE | |
| `base_template_id` | FK → `service_type_templates.id` | |
| `name` | text | Church's custom name for this template |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| | UNIQUE(`church_id`, `base_template_id`) | |

#### `church_template_sections`

Full copy of template sections for a church's customised version. When a church customises a template, all sections from `template_sections` are copied here so the church has full control over ordering, additions, and deletions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `church_template_id` | FK → `church_templates.id` ON DELETE CASCADE | |
| `section_key` | text | |
| `title` | text | |
| `major_section` | text nullable | |
| `position_order` | integer | |
| `liturgical_text_id` | FK → `liturgical_texts.id` nullable | |
| `music_slot_type` | enum nullable | |
| `placeholder_type` | text nullable | |
| `optional` | boolean | |
| `allow_override` | boolean | |

#### `service_sections`

The actual running order for a specific service instance. Created by copying from the church template (or system template if uncustomised) when a new service is made. Fully editable per service. This is what the PDF renderer reads.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `service_id` | FK → `services.id` ON DELETE CASCADE | |
| `section_key` | text | |
| `title` | text | |
| `major_section` | text nullable | |
| `position_order` | integer | |
| `liturgical_text_id` | FK → `liturgical_texts.id` nullable | Default text for this section |
| `text_override` | jsonb nullable | `[{speaker, text}]` — replaces liturgical_text if set |
| `music_slot_id` | FK → `music_slots.id` nullable | Links to the music assignment |
| `placeholder_type` | text nullable | |
| `placeholder_value` | text nullable | Resolved value: selected collect text, reading reference, etc. |
| `visible` | boolean default true | Soft-hide without deleting (e.g. Gloria in Advent) |

#### `eucharistic_prayers`

All eucharistic prayers with full text, descriptions, and rite classification.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `key` | text UNIQUE | `cw-a`, `cw-b`, ... `cw-h`, `bcp-consecration` |
| `name` | text | `Prayer A`, `Prayer of Consecration (BCP)` |
| `rite` | enum(`CW`, `BCP`) | |
| `description` | text | Brief summary of character and typical usage |
| `blocks` | jsonb | `[{speaker, text}]` — full prayer text |
| `created_at` | timestamptz | |

Seeded from the current `src/data/liturgy/eucharistic-prayers.ts` plus BCP consecration prayer.

#### `collects`

Multiple collects per liturgical day. Churches can add custom collects.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `liturgical_day_id` | FK → `liturgical_days.id` nullable | null for custom collects unlinked to calendar |
| `rite` | enum(`CW`, `BCP`, `CUSTOM`) | |
| `title` | text | e.g. `Collect for the Third Sunday of Advent (BCP)` |
| `text` | text | Full collect text |
| `church_id` | FK → `churches.id` nullable | null = system-provided, set = church custom |
| `created_at` | timestamptz | |

The existing `collect` column on `liturgical_days` becomes the seed source for CW collects. BCP collects are seeded additionally.

#### `hymn_verses`

One row per verse of hymn text, scraped from hymnary.org at build time.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `hymn_id` | FK → `hymns.id` ON DELETE CASCADE | |
| `verse_number` | integer | 1-indexed |
| `text` | text | Full verse text with line breaks preserved |
| `is_chorus` | boolean default false | true for refrains/choruses |
| | UNIQUE(`hymn_id`, `verse_number`) | |

### 2.2 Modified tables

#### `services`

| Change | Column | Type | Notes |
|--------|--------|------|-------|
| REMOVE | `eucharistic_prayer` | text | Was a letter A–H |
| ADD | `eucharistic_prayer_id` | FK → `eucharistic_prayers.id` nullable | Proper reference |
| ADD | `collect_id` | FK → `collects.id` nullable | Selected collect |
| ADD | `collect_override` | text nullable | Free-text collect override (takes precedence over `collect_id`) |

#### `music_slots`

| Change | Column | Type | Notes |
|--------|--------|------|-------|
| ADD | `verse_count` | integer nullable | How many verses to include in the booklet |
| ADD | `selected_verses` | integer[] nullable | Explicit override: e.g. `{1,3,5,7}` |

When `verse_count` is set but `selected_verses` is null, the auto-selection algorithm runs. When `selected_verses` is set, it takes precedence.

**Note on `music_slots.service_id`:** The existing `music_slots.service_id` FK is retained. The new `service_sections.music_slot_id` establishes the structural link (which section this slot belongs to). `music_slots.service_id` remains for direct service-level queries and cascading deletes. Both references point to the same service.

#### `churches.settings` (JSON)

| Change | Key | Type | Notes |
|--------|-----|------|-------|
| ADD | `default_verse_count` | number | Church-wide default, e.g. 4 |
| ADD | `default_eucharistic_prayer_id` | string (uuid) nullable | Default prayer for new services |

### 2.3 Template resolution order

```
System Template (service_type_templates + template_sections)
        ↓
Church Template (church_templates + church_template_sections)
  — created lazily when a church customises defaults
  — if no church template exists, system template is used
        ↓
Service Instance (service_sections)
  — copied from church template (or system template) when service is created
  — fully independent after creation: edits don't propagate back
```

When a new service is created:
1. Look up `church_templates` for this church + service type
2. If found → copy `church_template_sections` into new `service_sections` rows
3. If not found → copy `template_sections` from the system template
4. The service now has its own `service_sections` rows to edit freely

---

## 3. Configurable Service Structure

### 3.1 Running order as the editor

The service editor is a reorderable list of sections. Each section row displays:

- **Drag handle** — for reordering via drag-and-drop
- **Type icon** — music (hymn/anthem/mass setting), liturgical text (rubric/prayer/creed), reading, placeholder (collect/sermon/eucharistic prayer)
- **Title and content summary** — section name + preview of the text or music assignment
- **Inline controls** — contextual to the section type (verse stepper for hymns, collect dropdown, "Browse prayers" for eucharistic prayer, "Override" for readings)
- **Show/Hide toggle** — soft-hides from the booklet without deleting (useful for seasonal omissions: Gloria in Advent/Lent)
- **Delete button** — removes the section from this service. Confirmation dialog for liturgical text sections.

Major section headers (THE GATHERING, LITURGY OF THE WORD, etc.) appear as non-editable dividers between groups of sections. Sections can be dragged across major section boundaries.

### 3.2 Adding sections

An "+ Add section" button at the bottom of the running order opens a picker with categories:

- **Hymn** — adds a new hymn slot (opens hymn search)
- **Liturgical text** — pick from `liturgical_texts` (creed, confession, greeting, blessing, etc.)
- **Reading** — adds a reading placeholder
- **Custom text** — freeform text block with speaker attribution
- **Restore removed** — lists any sections from the base template that were deleted, allowing them to be re-added

New sections are appended at the end; the admin reorders as needed.

### 3.3 Delete and reorder

**Delete:** Clicking the delete button on a section row removes it from `service_sections`. A confirmation dialog appears for sections that contain liturgical text (e.g., "Remove the Nicene Creed from this service?"). Music slots linked to deleted sections are also deleted via cascade.

**Reorder:** Drag-and-drop via the grab handle. On drop, `position_order` values are recalculated for all sections. On mobile, reorder uses a long-press gesture.

**Delete services:** A "Delete service" action is added to service settings. Cascades to all `service_sections` and `music_slots` for that service. Confirmation required.

### 3.4 Collect chooser

The collect section row has an inline dropdown with three options:

- **CW Collect** — the Common Worship collect for this liturgical day (from `collects` table)
- **BCP Collect** — the Book of Common Prayer collect (from `collects` table)
- **Custom** — opens an inline text editor. The custom text is saved to `services.collect_override`.

The collect text preview updates immediately when the selection changes. The resolved text (from `collects.text` or `services.collect_override`) is stored on `service_sections.placeholder_value` for the PDF renderer.

### 3.5 Eucharistic prayer browser

The eucharistic prayer section row has a "Browse prayers" button that opens a slide-out panel listing all prayers from the `eucharistic_prayers` table:

- Each prayer shows its **name**, **rite** (CW/BCP), and **description** (brief summary of character and typical usage)
- A "Preview full text" expander shows the complete prayer text
- The currently selected prayer is highlighted
- Clicking a prayer selects it and updates `services.eucharistic_prayer_id`

### 3.6 Church template admin

A new admin page at `/churches/[churchId]/settings/templates` allows the admin to customise default templates for each service type:

- Lists all service types the church uses
- Clicking a service type shows the default running order (from system template or church override)
- The admin can add, remove, reorder, and show/hide sections — same UI as the service editor
- On first edit, the system template sections are copied to `church_template_sections`
- A "Reset to default" action reverts to the system template (deletes the `church_templates` row)
- Changes to church templates do not retroactively affect existing services

---

## 4. Hymn Text & Verse Control

### 4.1 Build-time scrape

A new script `scripts/scrape-hymn-text.ts` fetches hymn lyrics from hymnary.org:

- **Inputs:** All hymns in the `hymns` table
- **Sources:**
  - NEH: `https://hymnary.org/hymn/NEH1985/[number]`
  - AM: `https://hymnary.org/hymn/AM2013/[number]`
- **Parsing:** Extracts the "Full Text" section. Splits into numbered stanzas. Identifies refrains/choruses (marked with "Refrain", "Chorus", or unnumbered repeating stanzas).
- **Output:** Inserts into `hymn_verses` table — one row per verse, with `is_chorus = true` for refrains
- **Behaviour:** Rate-limited (respectful delays between requests). Idempotent — re-running updates existing data via upsert on `(hymn_id, verse_number)`. Logs any hymns where text could not be found.
- **Execution:** `npm run db:scrape-hymns` — run manually or as part of the seed pipeline

### 4.2 Verse selection algorithm

When a music slot has a hymn assigned and `verse_count` is set:

1. Fetch all verses for the hymn from `hymn_verses` (excluding choruses)
2. If `selected_verses` is set, use that explicit list
3. Otherwise, auto-select using `verse_count`:
   - Always include verse 1 (first) and verse N (last)
   - Fill remaining slots by evenly spacing from the middle verses
   - Example: 7 verses, 4 requested → [1, 3, 5, 7]
   - Example: 6 verses, 3 requested → [1, 3, 6]
   - Example: 8 verses, 2 requested → [1, 8] (first and last only, all middle content skipped)
4. Choruses/refrains (`is_chorus = true`) appear after each selected verse and do not count toward `verse_count`
5. If the hymn has fewer or equal verses to `verse_count`, all verses are included

The selected verses are resolved at PDF render time, not stored denormalised.

### 4.3 Default verse count

`churches.settings.default_verse_count` (e.g. `4`) is applied when a hymn is first added to a music slot:

- If the hymn has more verses than the default → `verse_count` is set to the default
- If the hymn has fewer or equal verses → `verse_count` is set to the total verse count (all verses)
- The admin can always adjust `verse_count` per slot via the +/− stepper

### 4.4 Manual verse selection

For fine-grained control, a "Select verses" link on the hymn row opens a checklist of all verses (with text preview). The admin toggles individual verses on/off. This populates `music_slots.selected_verses` as an explicit array, overriding the auto-selection algorithm.

---

## 5. Editable Booklet Preview

### 5.1 Workflow

1. Admin clicks "Preview & Edit" on a service
2. A preview pane renders the service booklet as it will appear in the PDF — proper typography, speaker attribution (President/All/Reader), section headers, hymn verses, readings, liturgical text
3. The admin clicks any text block to edit it inline
4. Changes are saved as `text_override` on the corresponding `service_sections` row (or `collect_override` / `placeholder_value` for placeholders)
5. Overrides are non-destructive: a "Reset to default" link appears on any overridden block, restoring the original liturgical text
6. "Export PDF" / "Export DOCX" buttons generate the final document from the (possibly overridden) data

### 5.2 Implementation approach

The preview is a React component that mirrors the PDF layout but renders in the browser:

- Uses the same data pipeline as `build-sheet-data.ts` — fetches service sections, resolves music, readings, liturgical text
- Renders with the same heading hierarchy, speaker attribution, and section structure as the PDF
- Each text block wraps in an editable container: clicking activates a textarea or contentEditable span
- On blur/save, the override is written to the `service_sections` row via API
- The component uses the church's service sheet template settings (font, paper size, accent colour) for accurate preview

### 5.3 Scope boundary

The preview is a text-editing layer, not a full page-layout editor. The admin cannot:
- Change fonts, colours, or spacing (those are church-level template settings)
- Rearrange sections (that happens in the running order editor)
- Add or remove sections (running order editor)

The admin can:
- Edit any text content (liturgical text, readings, collects, rubrics)
- See exactly how hymn verses will appear with the current verse selection
- Verify the overall flow before exporting

---

## 6. UI/UX Improvements

### 6.1 "Sundays" → "Services"

- Sidebar nav label changes from "Sundays" to "Services"
- Route changes: `/churches/[churchId]/sundays` → `/churches/[churchId]/services`
- Route changes: `/churches/[churchId]/sundays/[date]` → `/churches/[churchId]/services/[date]`
- Page titles, breadcrumbs, and all references updated
- Old routes redirect to new routes for bookmarked URLs

### 6.2 Readings box spacing fix

**Web (service detail page):**
- Increase gap between reading position label and scripture reference
- Add horizontal rule or visual separator between individual readings
- Increase line-height for reading text display

**PDF (booklet):**
- Increase `paddingLeft` on reading text from `8` to `16`
- Increase `lineHeight` on reading text for readability
- Add `marginBottom` between consecutive readings

### 6.3 Service completeness indicators

Each service card on the services list shows a status dot:

- **Green dot** — all music slots filled, eucharistic prayer selected (if applicable), readings confirmed
- **Amber dot** — some slots filled, partially planned
- **Grey dot** — template only, nothing assigned

Completeness is calculated from `service_sections`: count how many sections with `music_slot_type` have a linked `music_slot_id` with content, how many placeholders are resolved, etc.

### 6.4 Better save/feedback patterns

Applied consistently across the app:

- **Button loading state** — spinner + disabled during save operations
- **Inline success** — brief "Saved" confirmation next to the save button, not just a toast
- **Inline errors** — validation messages next to the failing field
- **Optimistic UI** — update the UI immediately on user action, revert on API error
- **Toast notifications** — reserved for background actions (e.g., "Service deleted") rather than inline saves

### 6.5 PDF preview before download

- A "Preview" button generates a read-only PDF view in an overlay panel using `@react-pdf/renderer`
- Shows the booklet exactly as it will be downloaded
- "Edit" button navigates to the editable preview (§5)
- "Download PDF" and "Download DOCX" buttons on the preview panel
- Panel shows paper size and mode (booklet/summary) as badges

### 6.6 Mobile responsiveness of service editor

- Each section row stacks vertically on narrow screens: title on top, content summary below, action icons as a horizontal row at the bottom
- Drag reorder uses long-press gesture on mobile
- Verse stepper and collect dropdown remain inline but resize to fit
- Major section headers span full width
- The "+ Add section" button is full-width on mobile

### 6.7 Readings override

On any reading section in the running order, an "Override" button allows the admin to:

- Change the scripture reference (free text input for the reference, e.g. "Romans 8.28–39")
- Paste or type custom reading text
- The original lectionary reading is preserved; the override is stored on `service_sections.text_override` and `service_sections.placeholder_value`
- A "Reset to lectionary" link reverts the override

---

## 7. Design System Compliance

All new UI must use the existing design system:

- **Primary:** `#8B4513` (saddle brown)
- **Secondary:** `#4A6741` (olive green)
- **Background:** `#FAF6F1` (warm beige)
- **Foreground:** `#2C2416` (dark brown)
- **Border:** `#D4C5B2` (warm tan)
- **Destructive:** `#8B2500` (deep red)
- **Muted:** `#F5F0E8` / `#6B5E4F`
- **Heading font:** Cormorant Garamond (serif)
- **Body font:** Libre Baskerville (serif)
- **Mono font:** JetBrains Mono
- **Border radius:** 2px everywhere
- **Shadows:** Warm brown-tinted (`rgba(44, 36, 22, ...)`)
- **Liturgical colours:** purple `#5B2C6F`, gold `#D4AF37`, green `#4A6741`, red `#8B2500`, white `#F5F0E8`, rose `#C48A9F`

Use existing shadcn/ui component patterns (Button, Card, Badge, Dialog, Select, Tabs, etc.) from `src/components/ui/`. New components follow the same patterns.

---

## 8. Migration Strategy

### 8.1 Database migration

1. Create all new tables (`liturgical_texts`, `service_type_templates`, `template_sections`, `church_templates`, `church_template_sections`, `service_sections`, `eucharistic_prayers`, `collects`, `hymn_verses`)
2. Add new columns to `services` and `music_slots`
3. Seed `liturgical_texts` from `src/data/liturgy/*.ts`
4. Seed `service_type_templates` + `template_sections` from current hardcoded `ServiceTemplate` definitions
5. Seed `eucharistic_prayers` from `src/data/liturgy/eucharistic-prayers.ts` + BCP
6. Seed `collects` from `liturgical_days.collect` (CW) + additional BCP collects
7. Run `scrape-hymn-text.ts` to populate `hymn_verses`
8. Migrate existing `services.eucharistic_prayer` (letter) to `services.eucharistic_prayer_id` (FK)
9. For each existing service, generate `service_sections` rows from the corresponding system template
10. Backfill `music_slots` into the new `service_sections.music_slot_id` references
11. Drop the old `eucharistic_prayer` text column from `services`

### 8.2 Code removal

After migration, remove:
- `src/data/liturgy/` TypeScript template files (data now in DB)
- Hardcoded `ServiceTemplate`, `LiturgicalSection`, `LiturgicalTextBlock` types (replaced by DB queries)
- Any references to the old template system in `build-sheet-data.ts` and PDF components

### 8.3 Route migration

- Add redirects from `/churches/[churchId]/sundays/*` to `/churches/[churchId]/services/*`

---

## 9. Testing Strategy

### 9.1 Unit tests

- Verse selection algorithm (all edge cases: fewer verses than requested, exactly equal, chorus handling, manual override)
- Template resolution (system → church → service cascade)
- Service completeness calculation
- Collect resolution priority (override > collect_id > liturgical_day default)

### 9.2 Integration tests

- Create service → verify `service_sections` copied from correct template
- Customise church template → create new service → verify church sections used
- Edit service sections (add, delete, reorder, hide) → verify persistence
- Select eucharistic prayer → verify FK and text resolution
- Set verse count → verify correct verses in PDF output
- Override reading text → verify override appears in preview and PDF

### 9.3 E2E tests (Playwright)

- Full service planning flow: create service → assign hymns → set verse counts → choose collect → choose eucharistic prayer → preview → edit text → export PDF
- Church template customisation: customise template → create new service → verify customised structure
- Mobile: verify stacked layout, long-press reorder, responsive controls

---

## 10. Open Questions

None — all decisions resolved during brainstorming.
