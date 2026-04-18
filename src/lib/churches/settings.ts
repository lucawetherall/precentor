/**
 * Typed helpers for the `churches.settings` JSON column.
 *
 * The column is shared across multiple features, so every read/write narrows to
 * a specific key (e.g. `sheetMusicLink`) and preserves the rest of the object.
 */

export interface SheetMusicLink {
  url: string;
  label?: string;
}

type Settings = Record<string, unknown> | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the sheet-music-library link from a church's `settings` blob.
 * Returns `null` if no valid link is stored.
 */
export function readSheetMusicLink(settings: Settings): SheetMusicLink | null {
  if (!isRecord(settings)) return null;
  const raw = settings.sheetMusicLink;
  if (!isRecord(raw)) return null;

  const url = typeof raw.url === "string" ? raw.url : null;
  if (!url) return null;

  const label = typeof raw.label === "string" && raw.label.trim().length > 0
    ? raw.label.trim()
    : undefined;

  return { url, label };
}

/**
 * Return a new settings object with `sheetMusicLink` updated.
 * Pass `null` to remove the key entirely. Other keys are preserved verbatim.
 */
export function writeSheetMusicLink(
  settings: Settings,
  value: SheetMusicLink | null,
): Record<string, unknown> {
  const base: Record<string, unknown> = isRecord(settings) ? { ...settings } : {};
  if (value === null) {
    delete base.sheetMusicLink;
    return base;
  }
  const next: SheetMusicLink = { url: value.url };
  if (value.label && value.label.trim().length > 0) next.label = value.label.trim();
  base.sheetMusicLink = next;
  return base;
}
