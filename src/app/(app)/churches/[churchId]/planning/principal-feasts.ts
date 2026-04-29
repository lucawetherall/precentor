import { parseISO, getDay } from "date-fns";

/**
 * Sunday-key slugs for the seven CofE Principal Feasts. Slugs match the
 * keys used in src/data/lectionary-coe.json.
 *
 * Principal Holy Days (Ash Wed / Maundy Thu / Good Fri) are deliberately
 * not included: the user's brief was "Sundays + Principal Feasts +
 * Festivals" (a different CofE category), and the fallback service type
 * SUNG_EUCHARIST is the wrong liturgy for Good Friday and Ash Wednesday.
 */
export const PRINCIPAL_FEAST_KEYS: ReadonlySet<string> = new Set([
  "christmas-day",
  "the-epiphany",
  "easter-day",
  "ascension-day",
  "day-of-pentecost-whit-sunday",
  "trinity-sunday",
  "all-saints-day",
]);

/**
 * A "qualifying day" is one that should always have at least one row in the
 * planning grid, even when the church has no pattern configured for that
 * weekday: every Sunday, every Principal Feast, every Festival.
 */
export function isQualifyingDay(
  date: string,
  sundayKey: string | null,
  section: string | null,
): boolean {
  // 0 = Sunday under date-fns (and JS Date)
  if (getDay(parseISO(date)) === 0) return true;
  if (section === "Festivals") return true;
  if (sundayKey && PRINCIPAL_FEAST_KEYS.has(sundayKey)) return true;
  return false;
}
