/**
 * Curated set of Church of England Festivals that a parish may keep on a
 * neighbouring Sunday ("transferred"), plus same-Sunday alternate provisions.
 *
 * Every `key` MUST exist in `lectionary-coe.json` under `sundays` with full
 * A/B/C readings — that's where the swapped title, colour, collect and readings
 * come from. A colocated test enforces this.
 *
 * Scope notes (deliberate omissions):
 *   • Christ the King is already the calendar name for the last Sunday before
 *     Advent — there is nothing to switch to.
 *   • Gaudete (Advent 3) is a rose-vestment emphasis with no distinct readings
 *     or lectionary key, so it isn't modelled here (it would need a colour-only
 *     override, a different mechanism).
 *   • The Nativity of the BVM (8 Sep) is absent from the bundled lectionary
 *     data, so it can't be offered until its Common Worship readings are added.
 *   • The Christmas-octave festivals (Stephen 26 Dec, John 27 Dec, Holy
 *     Innocents 28 Dec) are traditionally kept on their own days, not
 *     transferred, and sit too close to Christmas Sundays — omitted.
 */

export type SpecialKind = "transferred" | "alternate";

export interface TransferableSpecial {
  /** Key into lectionary-coe.json `sundays`. */
  key: string;
  kind: SpecialKind;
  /** Fixed feast date (1-indexed month/day) — for kind "transferred". */
  month?: number;
  day?: number;
  /** Sunday key this provision belongs to — for kind "alternate". */
  appliesToSundayKey?: string;
  /** How many days either side of the fixed date a Sunday may catch it. */
  windowDays?: number;
}

/** Default catch window: both Sundays flanking any weekday, never one further. */
export const DEFAULT_WINDOW_DAYS = 6;

export const TRANSFERABLE_SPECIALS: readonly TransferableSpecial[] = [
  // ─── Transferred Festivals (fixed saints'-day dates) ───
  { key: "the-conversion-of-paul", kind: "transferred", month: 1, day: 25 },
  { key: "candlemas", kind: "transferred", month: 2, day: 2 },
  { key: "joseph-of-nazareth", kind: "transferred", month: 3, day: 19 },
  { key: "the-annunciation-of-our-lord", kind: "transferred", month: 3, day: 25 },
  { key: "george", kind: "transferred", month: 4, day: 23 },
  { key: "mark", kind: "transferred", month: 4, day: 25 },
  { key: "philip-and-james", kind: "transferred", month: 5, day: 1 },
  { key: "matthias", kind: "transferred", month: 5, day: 14 },
  { key: "the-visit-of-the-blessed-virgin-mary-to-elizabeth", kind: "transferred", month: 5, day: 31 },
  { key: "barnabas", kind: "transferred", month: 6, day: 11 },
  { key: "the-birth-of-john-the-baptist", kind: "transferred", month: 6, day: 24 },
  { key: "peter-and-paul", kind: "transferred", month: 6, day: 29 },
  { key: "thomas", kind: "transferred", month: 7, day: 3 },
  { key: "mary-magdalene", kind: "transferred", month: 7, day: 22 },
  { key: "james", kind: "transferred", month: 7, day: 25 },
  { key: "the-transfiguration-of-our-lord", kind: "transferred", month: 8, day: 6 },
  { key: "the-blessed-virgin-mary", kind: "transferred", month: 8, day: 15 },
  { key: "bartholomew", kind: "transferred", month: 8, day: 24 },
  { key: "holy-cross-day", kind: "transferred", month: 9, day: 14 },
  { key: "matthew", kind: "transferred", month: 9, day: 21 },
  { key: "michael-and-all-angels", kind: "transferred", month: 9, day: 29 },
  { key: "luke", kind: "transferred", month: 10, day: 18 },
  { key: "simon-and-jude", kind: "transferred", month: 10, day: 28 },
  { key: "andrew", kind: "transferred", month: 11, day: 30 },

  // ─── Same-Sunday alternate provisions ───
  // Mothering Sunday (Laetare) — an alternative to the regular Fourth Sunday
  // of Lent, with its own readings.
  { key: "mothering-sunday", kind: "alternate", appliesToSundayKey: "the-fourth-sunday-of-lent" },
];
