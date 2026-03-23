# Automatic Lectionary: Fully Offline, Zero-Intervention Lectionary System

## Problem

The current lectionary sync requires manual intervention: a user must navigate to the dashboard, configure options (Bible version, whether to fetch text), and click "Sync". Scripture text is fetched at runtime from the Oremus Bible API, and the liturgical calendar optionally calls `api.liturgical.uk`. Services must be manually created for each Sunday. None of this should require user action.

## Goal

Eliminate all manual steps. Liturgical days, readings (with full NRSVAE text), and default services should exist in the database automatically. No external API calls at runtime. No sync UI. Everything works offline from bundled data.

## Design

### 1. Build-time Scripture Data Bundle

A one-off developer script scrapes all NRSVAE text from the Oremus Bible Browser for every reading reference in `lectionary-coe.json`.

**Script:** `scripts/scrape-readings-text.ts`
- Iterates through all sundays in `lectionary-coe.json`, all years (A, B, C), all services (principal, second, third), all readings
- Deduplicates references (many readings repeat across years/services)
- Fetches each unique reference from `https://bible.oremus.org/?version=NRSVAE&passage=<ref>`
- Rate-limits at 200ms between requests
- Outputs `src/data/lectionary-readings-text.json`: a flat `Record<string, string>` mapping reference to text
- Inlines the `extractScriptureText()` HTML parsing function from `oremus-api.ts` (copied before that file is deleted; only needed by this script)

**Estimated data:** ~2,000-3,000 unique reading references, ~5-10 MB of text. Committed to the repo.

**Run once:** `npx tsx scripts/scrape-readings-text.ts`. Re-run only if the lectionary data changes.

### 2. Database Seed Script

A seed script populates `liturgical_days` and `readings` from bundled data. No external API calls.

**Script:** `scripts/seed-lectionary.ts`
- Computes the liturgical calendar for the current + next church year using `computeLocalCalendar()` (existing function in `calendar.ts`)
- For each calendar entry, looks up readings from `lectionary-coe.json` and text from `lectionary-readings-text.json`
- Upserts into `liturgical_days` and `readings` tables
- All readings get `bibleVersion: "NRSVAE"` and pre-filled `readingText`
- After seeding liturgical data, creates default services for all churches that have a `defaultServices` template in their `settings` JSON

**Invocation:** `npm run db:seed` (added to package.json scripts). Run during deployment or manually after migrations.

**Reusable logic:** The core `buildReadingRows()` function from `mapper.ts` is preserved and refactored into a pure utility (no API calls). The upsert logic for `liturgical_days` is also preserved.

### 3. Default Services on Church Creation

The church creation form gains a "Regular Services" section where the user selects which services their church holds each Sunday.

**Data model:** Uses the existing `settings` JSON column on the `churches` table:
```ts
// churches.settings shape:
{
  defaultServices?: Array<{
    type: "SUNG_EUCHARIST" | "CHORAL_EVENSONG" | "SAID_EUCHARIST" | "CHORAL_MATINS" | "FAMILY_SERVICE" | "COMPLINE";
    time: string; // e.g. "10:00"
  }>;
}
```

**Constraint:** Each service type may appear at most once in the `defaultServices` array. The UI enforces this via checkboxes (one per type). This aligns with the existing unique constraint on `services(churchId, liturgicalDayId, serviceType)`.

**Church creation flow (single page):**
1. Existing fields: name, diocese, address, CCLI number
2. New section: "Regular Services" — checkboxes for each service type, with a time input for each selected type
3. On submit (`POST /api/churches`):
   - Creates church + admin membership (existing)
   - Stores `defaultServices` in `settings`
   - Queries all existing `liturgical_days` and creates a `service` row for each day + each default service type

**Seed script integration:** When the seed script creates new `liturgical_days` for a future church year, it also creates services for every church with a `defaultServices` template.

### 4. Files Deleted

| File | Reason |
|------|--------|
| `src/app/(app)/dashboard/lectionary/page.tsx` | Manual sync UI removed |
| `src/app/(app)/dashboard/lectionary/sync-form.tsx` | Manual sync UI removed |
| `src/app/(app)/dashboard/lectionary/loading.tsx` | Manual sync UI removed |
| `src/app/api/cron/sync-lectionary/route.ts` | Cron sync endpoint removed |
| `src/lib/lectionary/oremus-api.ts` | Runtime Oremus client removed |

### 5. Files Modified

| File | Changes |
|------|---------|
| `src/lib/lectionary/mapper.ts` | Refactored into pure seed utility — reads from bundled JSON files, no API calls. Exports `seedLectionaryData()` function. |
| `src/lib/lectionary/calendar.ts` | Remove `fetchLiturgicalDate()`, `apiNameToSundayKey()`, `mapApiColour()`, `mapApiSeason()`, `computeLiturgicalCalendar()` (the async wrapper), the `LITURGICAL_API` constant, `LiturgicalApiResponse` interface, and the `sleep` helper. Rename and export `computeLocalCalendar()` as `computeLiturgicalCalendar()` (now synchronous). Keep `computeEasterDate()`, `computeAdventStart()`, `getChurchYear()`, `getLectionaryYear()`, `findProperSundayKey()` (internal). |
| `src/app/(app)/churches/new/page.tsx` | Add "Regular Services" section with service type checkboxes and time inputs |
| `src/app/api/churches/route.ts` | Accept `defaultServices` in request body, store in `settings`, create service rows for all liturgical days |
| Dashboard navigation | Remove lectionary link |

### 6. New Files

| File | Purpose |
|------|---------|
| `scripts/scrape-readings-text.ts` | One-off script to download all NRSVAE text from Oremus |
| `src/data/lectionary-readings-text.json` | Bundled scripture text (~5-10 MB) |
| `scripts/seed-lectionary.ts` | DB seed script for liturgical days, readings, and default services |

### 7. Environment Variables

- `BIBLE_VERSION` — removed (hardcoded to NRSVAE)
- `CRON_SECRET` — kept (still used by `log-performances` cron)

## Verification

1. Run `npx tsx scripts/scrape-readings-text.ts` and verify `lectionary-readings-text.json` is created with text for all readings
2. Run `npm run db:seed` and verify `liturgical_days` and `readings` tables are populated for current + next church year
3. Create a new church with default services selected — verify services are auto-created for all Sundays
4. Navigate to a Sunday detail page — verify readings appear with full NRSVAE text
5. Generate a service sheet — verify reading text is included
6. Verify the old sync dashboard page returns 404
7. Run existing tests (`npm test`) and ensure nothing breaks
