import { differenceInCalendarDays, parseISO, getDay } from "date-fns";
import { PRINCIPAL_FEAST_KEYS } from "./principal-feasts";
import {
  TRANSFERABLE_SPECIALS,
  DEFAULT_WINDOW_DAYS,
  type TransferableSpecial,
} from "@/data/transferable-festivals";

/**
 * Seasons whose Sundays are too important to be displaced by a transferred
 * Festival (CofE: Festivals do not normally displace the Sundays of Advent,
 * Lent, Holy Week or Easter). Same-Sunday `alternate` provisions are exempt —
 * they belong to a specific Sunday by design.
 */
const BLOCKED_SEASONS: ReadonlySet<string> = new Set(["ADVENT", "LENT", "HOLY_WEEK", "EASTER"]);

/**
 * Which transferable specials a church may switch a given Sunday's service to.
 * Pure (no DB). Used both server-side (to offer choices and validate a PATCH)
 * and is safe to run on the client.
 *
 * - `transferred`: offered when the festival's fixed date falls within the
 *   catch window (default ±6 days, i.e. either Sunday flanking the festival's
 *   week) AND the festival doesn't itself land on a Sunday (then it's already
 *   on the calendar) AND the Sunday isn't a Principal Feast or in a blocked
 *   season.
 * - `alternate`: offered only on the exact Sunday it belongs to.
 */
export function availableSpecialsForSunday(
  sundayDate: string,
  sundayKey: string | null,
  season: string | null,
): TransferableSpecial[] {
  const date = parseISO(sundayDate);
  const year = date.getFullYear();
  const result: TransferableSpecial[] = [];

  for (const special of TRANSFERABLE_SPECIALS) {
    if (special.kind === "alternate") {
      if (sundayKey && special.appliesToSundayKey === sundayKey) result.push(special);
      continue;
    }

    // transferred
    if (special.month == null || special.day == null) continue;
    if (sundayKey && PRINCIPAL_FEAST_KEYS.has(sundayKey)) continue;
    if (season && BLOCKED_SEASONS.has(season)) continue;

    const window = special.windowDays ?? DEFAULT_WINDOW_DAYS;
    // Check the fixed date in this and adjacent years so a late-Dec / early-Jan
    // Sunday can still catch a festival across the year boundary.
    for (const y of [year - 1, year, year + 1]) {
      const feast = new Date(y, special.month - 1, special.day);
      if (getDay(feast) === 0) continue; // already a Sunday → on the calendar
      if (Math.abs(differenceInCalendarDays(date, feast)) <= window) {
        result.push(special);
        break;
      }
    }
  }

  return result;
}
