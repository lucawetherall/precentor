# Bulk Service Planning Grid — Design

**Date:** 2026-04-19
**Status:** Approved, ready for implementation plan

## Problem

Directors of music plan music for many services at once — a fortnight, a term, a season — but the app today only lets them edit one service at a time. Several admins have fallen back to planning in an external spreadsheet and transcribing into the app afterwards, which is slow and error-prone. We need a bulk-editing surface that respects how DoMs already think: rows of services, columns of music slots, keyboard-driven.

## Users & scope

**Who:** Church memberships with role `ADMIN` or `EDITOR`. Members cannot access the feature and the sidebar link is hidden for them. Enforcement is server-side on every route and server action using the existing `requireChurchRole(churchId, 'EDITOR')` helper.

**What's in scope:**

- A spreadsheet-style grid, one row per service, for a user-chosen date range.
- Generative rows: services that don't yet exist for the range are pre-populated as *ghost rows* from the church's service patterns; they materialise into real services on first edit.
- Excel-feel editing: autocomplete dropdown, keyboard navigation (Arrow/Tab/Enter/Escape/F2), single-level Cmd-Z undo, multi-row paste from real spreadsheets, TSV copy out.
- CSV upload as a second entry path, with downloadable template and dry-run preview.
- DB changes: new `INTROIT` music slot type; new nullable `psalm_chant` text column on `music_slots`.

**What's explicitly out of scope (for v1):**

- Organ voluntaries other than the postlude (pre-service and offertory stay in the detail view only).
- Readings edits, collect selection, eucharistic prayer, sheet mode, mass setting defaults, reading-text inclusion toggles.
- Availability, rota entries, choir status.
- Real-time multi-user collaboration; conflict handling is last-writer-wins with a stale-data warning.
- Drag-to-fill handle, multi-level undo stack.
- Dedicated `psalm_chants` lookup table; distinct "Memorial Acclamation" slot type; voluntaries repertoire table.

## Data model changes

All additive — no destructive migrations.

1. **Add `INTROIT` to `music_slot_type` enum** (in `src/lib/db/schema-base.ts`). Available for every service type. An introit value reuses existing `music_slots` polymorphism: `anthem_id` for repertoire-anthem introits, `hymn_id` for hymn-number introits, `free_text` otherwise.

2. **Add `psalm_chant text` column to `music_slots`** (nullable). Populated only for slots where `slot_type = 'PSALM'`. Free text for v1 — no composer/key/source; promotion to a lookup table is a future follow-up.

3. **Acclamations on Eucharist rows** reuse the existing `GOSPEL_ACCLAMATION` slot type. No schema change.

No changes to `services`, `hymns`, `anthems`, `mass_settings`, `canticle_settings`, `responses_settings`, `liturgical_days`, `readings`.

## Column set

Eleven columns, left to right:

| # | Column | Behaviour |
|---|---|---|
| 1 | Date / Service | Sticky-left. Shows date + time + service type. Services on the same liturgical day are grouped with a shared date cell and a subtle divider. |
| 2 | Introit | Picker-backed autocomplete against church's anthem repertoire; free text allowed. `INTROIT` slot. |
| 3 | Hymns | Comma-separated list of hymn numbers or first lines. Parser accepts `117, 103, 271` or `117 103 271`. Each entry becomes a separate `HYMN` slot with sequential `position_order`. |
| 4 | Setting | Shape-shifts by row. Eucharist: labelled "Mass", autocomplete against `mass_settings`, stored in the `MASS_SETTING_GLOBAL` slot. Evensong: labelled "Mag & Nunc", autocomplete against `canticle_settings`, applied to both `CANTICLE_MAGNIFICAT` and `CANTICLE_NUNC_DIMITTIS` slots (single value, two slots). |
| 5 | Psalm | Free-text number. 1–150 canonical; anything else saves as free text (e.g. "23 vv 1–4"). Stored as the `PSALM` slot's `free_text`. |
| 6 | Chant | Free text with best-effort autocomplete from previously-used chant names in this church. Stored in the new `psalm_chant` column on the same `PSALM` slot row. |
| 7 | Responses / Acclamations | Evensong rows: autocomplete against `responses_settings`, stored in `RESPONSES` slot. Eucharist rows: free text only for v1, stored as `GOSPEL_ACCLAMATION` slot's `free_text`. |
| 8 | Anthem | Picker-backed autocomplete against `anthems`. `ANTHEM` slot. |
| 9 | Voluntary | Free text (no voluntaries table in v1). `ORGAN_VOLUNTARY_POST` slot. |
| 10 | Readings | Read-only context. Derived from the `readings` table for the service's liturgical day. Click opens a popover showing full text when available. |
| 11 | Info | Free-text notes, stored in the `services.notes` column. |

## UI & UX

**Entry point.** A new "Planning" item in the church sidebar, between Services and Rota. Hidden for MEMBER role.

**Route.** `src/app/(app)/churches/[churchId]/planning/`, with `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params for the date range so the view is linkable and back-button-safe.

**Page header.** Date-range picker with quick presets (*Next 4 weeks · Rest of term · Custom*). Default range: today → +6 weeks. Also in the header: an "Import CSV" button and a "Saving… / Saved" indicator matching the per-service editor.

**Grid structure.**

- First column (Date/Service) is sticky-left; horizontal scroll if the viewport is narrow.
- Header row is sticky-top within the scroll container.
- Rows are the union of:
  - Existing `services` in the range (ordered by date then time).
  - Ghost rows — one per `(date, service_type)` pair in the range that matches a `church_service_patterns` entry but has no corresponding `services` row. Rendered in a lighter tone.
- Empty state (no patterns configured): friendly placeholder linking to pattern settings. No grid rendered.

**Cell states.**

- Idle — value shown; cursor indicates focus.
- Edit — input visible, autocomplete dropdown open.
- Unmatched — saved as free text; small yellow dot on the cell; hover tooltip: "Will display on the service sheet as typed — not linked to a repertoire record."
- Read-only (Readings column) — subtly desaturated; click opens popover.

## Interaction

**Keyboard model.**

- Arrow keys move cell focus.
- Enter / F2 / double-click enters edit mode.
- Tab / Shift-Tab commits and moves horizontally; Enter commits and moves down.
- Escape cancels current edit.
- Cmd/Ctrl-Z undoes the most recent cell change only (single-level, per-session).
- Cmd/Ctrl-C copies the selected range as TSV to the clipboard.

**Autocomplete.**

- Opens on first keystroke in edit mode. Arrow up/down navigates; Enter selects; Escape dismisses.
- Shows up to 8 matches with a meta line (e.g. "Hymn · NEH 117", "Anthem · Mozart").
- Sources are column-specific (see column table above). For the Setting column, the source switches based on the row's service type.

**Free-text fallback.** Every picker-backed cell accepts arbitrary text. Unmatched entries save to `free_text` and flag with the yellow dot. The grid never refuses input.

**Multi-row paste.**

- Input: tab-separated values (from Google Sheets / Excel / Numbers) with newline-separated rows.
- Target: starts at the focused cell, paints right and down.
- Pasting into ghost rows creates their underlying services atomically as part of the paste transaction.
- Inline confirmation after paste: "Pasted N rows · M unmatched cells · Undo".

**Save model.** Debounced autosave per cell (1–2s after last keystroke) for single edits. Multi-row paste and CSV import each commit in a single batched server action. Header indicator reflects state.

**Conflict handling.** Optimistic updates with last-writer-wins. Each save sends the client's known `services.updated_at`; if stale, the server rejects and the client shows a toast ("This service was updated by someone else — refresh to see their changes") while keeping the local edit buffered.

## CSV import

**Entry.** "Import CSV" button in the page header opens a modal.

**Template.** Downloadable CSV with header row:

```
date,service_type,time,introit,hymns,setting,psalm,chant,responses_acclamations,anthem,voluntary,info
```

Template includes example rows for a Eucharist, an Evensong, and a blank row.

**Flow.**

1. User drops / selects a CSV. PapaParse (or equivalent) parses it client-side.
2. A preview table shows parsed rows with row-level and cell-level indicators:
   - Green row = matches an existing service by `(churchId, date, service_type)`.
   - Blue row = will create a new service.
   - Yellow dot on a cell = unmatched value, will save as free text.
   - Red row = invalid (bad date, unknown service_type, missing required fields). Skipped on commit.
3. An **Overwrite** toggle controls whether blank cells in the CSV clear existing values. Default: off (preserves existing).
4. User clicks **Import** to commit. Confirmation summary: "Creating N services, updating M, skipping K invalid."

**Parsing rules.**

- `date`: ISO `YYYY-MM-DD`.
- `service_type`: enum value, case-insensitive. Human aliases accepted (`Sung Eucharist` → `SUNG_EUCHARIST`).
- `time`: free text `HH:MM`.
- `hymns`: comma-separated numbers or first lines.
- All picker-backed columns match via the same logic as the grid's autocomplete; unmatched values become free text.
- CSV import never deletes slots; never touches readings, collect, eucharistic prayer, sheet settings, availability, or rota.

## Architecture

**Route and files.** Under `src/app/(app)/churches/[churchId]/planning/`:

- `page.tsx` — server component, reads date range from params, calls `planning.listRows`, renders the client grid in a `<Suspense>` boundary.
- `planning-grid.tsx` — top-level client component, owns grid-level state (date range, focus, selection, dirty-buffer, saving indicator).
- `planning-row.tsx` — one service row (real or ghost).
- `planning-cell.tsx` — one cell, handles focus and edit mode.
- `cell-autocomplete.tsx` — shared dropdown component used by picker-backed cells.
- `cell-parsers.ts` — pure parsing/matching logic (hymns, psalm, service-type aliases, etc.).
- `csv-import-modal.tsx` — upload / preview / commit.
- `use-planning-grid.ts` — hook for grid state, keyboard nav, paste, undo.
- `use-ghost-rows.ts` — computes ghost rows from patterns × date range.

Each file stays focused and small — consistent with `AGENTS.md` guidance on boundaries.

**Server actions** (colocated in `src/app/(app)/churches/[churchId]/planning/actions.ts` or equivalent, following project convention):

- `planning.listRows(churchId, from, to)` — real services + their slots (with joined hymn / anthem / setting names) + ghost-row metadata.
- `planning.updateCell(serviceRef, column, value)` — single-cell update. One cell edit may translate to 0–N `music_slots` writes: Hymns writes one slot per number in the list (reconciling adds/removes against existing hymn slots for that service); Setting on an Evensong writes both `CANTICLE_MAGNIFICAT` and `CANTICLE_NUNC_DIMITTIS` slots; Info writes `services.notes` (no slot). Creates the service if `serviceRef` is a ghost.
- `planning.bulkUpdate(changes[])` — batch transaction for multi-row paste; each change follows the same cell→slots translation rules as `updateCell`.
- `planning.importCsv(churchId, parsedRows, overwrite)` — CSV-specific commit entry.

Every action calls `requireChurchRole(churchId, 'EDITOR')` first.

**Ghost row materialisation.** First save to any cell on a ghost row runs a transaction that:

1. Upserts into `liturgical_days` if no row exists for that date (minimal record if lectionary data is unavailable).
2. Upserts into `services` using the existing `(church_id, liturgical_day_id, service_type)` unique constraint — concurrent creates are idempotent.
3. Inserts / updates the `music_slots` row for the edited cell.
4. Returns the new `service_id` so the client reconciles `ghost:<date>:<type>` → real id.

**Setting-column special case.** On Evensong rows the "Mag & Nunc" cell represents both `CANTICLE_MAGNIFICAT` and `CANTICLE_NUNC_DIMITTIS` slots. Writes update both slots to the same `canticle_setting_id`; reads derive the displayed value from the Mag slot and assume the Nunc slot matches (if they diverge, the detail view remains the source of truth and the grid shows the Mag value with a small divergence indicator).

**Reusing existing search.** The grid's autocomplete shares search logic with the per-service editor's pickers — extracted into `cell-parsers.ts` and shared query helpers rather than duplicated.

## Testing

**Vitest (unit):**

- `cell-parsers.ts` — hymn-list parsing, psalm validation, service-type alias resolution, autocomplete match scoring.
- `use-ghost-rows.ts` — ghost-row computation for various pattern × range combinations.
- CSV parser — happy path, invalid date, unknown service type, overwrite toggle semantics.

**Playwright (e2e):**

- Open grid for a church with patterns → ghost rows render.
- Type a hymn number → autocomplete match → Enter → saved → reload → value persists.
- Paste a 3-row TSV block spanning one real row and two ghost rows → services created, cells saved.
- CSV import happy path (create + update + skip invalid) → summary correct, changes persisted.
- Role gate — MEMBER receives 403 on the route and on direct server-action calls.

## Open items / future follow-ups

- Drag-to-fill handle.
- Multi-level undo stack (full history).
- `psalm_chants` lookup table (composer, key, source) replacing the free-text column.
- Distinct `MEMORIAL_ACCLAMATION` slot type.
- Voluntaries repertoire table.
- Real-time collaboration / live cursors.
