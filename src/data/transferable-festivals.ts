/**
 * Curated set of Church of England Festivals (and Anglo-Catholic feasts) a
 * parish may keep on a neighbouring Sunday ("transferred"), same-Sunday
 * alternate provisions, and traditional-name emphases.
 *
 * Readings policy — Common Worship first, Roman Rite only as a fallback:
 *   • `lectionaryKey` — pull title/colour/collect/readings from an existing
 *     `lectionary-coe.json` entry (reuses already-scraped scripture text).
 *   • `readings` — inline references for feasts not in the bundled JSON. CW
 *     where it exists (incl. via a "Common"), Roman only where CW has none.
 *   • emphasis — title-only swap; the day's colour/collect/readings are kept.
 *
 * The shared `liturgical_days`/`readings` rows are never touched — everything
 * here is resolved per-service at render time (see
 * `lib/services/effective-service-identity.ts`). A colocated test validates
 * every entry by kind.
 */
import type { ServiceReadings } from "@/lib/lectionary/types";
import type { ReadingPosition } from "@/lib/lectionary/bible-books";

export type SpecialKind = "transferred" | "alternate" | "emphasis";

/** Either one reading set used every year, or a distinct set per lectionary year. */
export type InlineReadings =
  | ServiceReadings
  | { A: ServiceReadings; B: ServiceReadings; C: ServiceReadings };

export interface TransferableSpecial {
  /** Stable id, stored on `services.special_feast_key`. */
  key: string;
  kind: SpecialKind;
  /** Fixed feast date (1-indexed) — for kind "transferred". */
  month?: number;
  day?: number;
  /** Movable feast: date = Easter + N days — for kind "transferred". */
  easterOffsetDays?: number;
  /** Sunday key this provision belongs to — for kind "alternate"/"emphasis". */
  appliesToSundayKey?: string;
  /** How many days either side of the date a Sunday may catch it. */
  windowDays?: number;
  /** Display title (defaults to the lectionaryKey/JSON name). */
  name?: string;
  /** Liturgical colour override (enum value, e.g. "WHITE"). */
  colour?: string;
  /** Collect text override. */
  collect?: string | null;
  /** Footnote shown by the chooser / member view. */
  note?: string;
  /** Provenance, surfaced in the footnote. */
  rite?: "CW" | "ROMAN";
  /** Pull readings (and fallback name/colour/collect) from this JSON key. */
  lectionaryKey?: string;
  /** Inline readings for feasts not in the bundled JSON. */
  readings?: InlineReadings;
}

/** Default catch window: both Sundays flanking any weekday, never one further. */
export const DEFAULT_WINDOW_DAYS = 6;

/** Build a ServiceReadings from [position, reference] pairs. */
function svc(
  principal: Array<[ReadingPosition, string]>,
  second: Array<[ReadingPosition, string]> = [],
): ServiceReadings {
  const map = (rows: Array<[ReadingPosition, string]>) =>
    rows.map(([position, reference]) => ({ position, reference }));
  return { principal: map(principal), second: map(second), third: [] };
}

// ─── Common-of-the-BVM Marian feasts (Common Worship provision) ───
// Each reuses the bundled 15 August set via `lectionaryKey`, so references and
// scripture text stay correct and consistent.
const BVM_LECTIONARY_KEY = "the-blessed-virgin-mary";
function marian(
  key: string,
  name: string,
  date: { month: number; day: number } | { easterOffsetDays: number },
  note = "Common of the Blessed Virgin Mary.",
): TransferableSpecial {
  return {
    key,
    kind: "transferred",
    ...date,
    name,
    colour: "WHITE",
    rite: "CW",
    lectionaryKey: BVM_LECTIONARY_KEY,
    note,
  };
}

export const TRANSFERABLE_SPECIALS: readonly TransferableSpecial[] = [
  // ─── Transferred Festivals already in the bundled lectionary ───
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

  // ─── Marian feasts on the Common of the BVM (CW provision) ───
  marian("the-nativity-of-the-bvm", "The Nativity of the Blessed Virgin Mary", { month: 9, day: 8 }),
  marian("our-lady-of-sorrows", "Our Lady of Sorrows", { month: 9, day: 15 }),
  marian("our-lady-of-walsingham", "Our Lady of Walsingham", { month: 9, day: 24 },
    "Common of the Blessed Virgin Mary (kept by the Anglican Shrine; not in the official Common Worship calendar)."),
  marian("our-lady-of-the-rosary", "Our Lady of the Rosary", { month: 10, day: 7 }),
  marian("the-queenship-of-the-bvm", "The Queenship of the Blessed Virgin Mary", { month: 8, day: 22 }),
  marian("our-lady-of-lourdes", "Our Lady of Lourdes", { month: 2, day: 11 }),
  marian("the-conception-of-the-bvm", "The Conception of the Blessed Virgin Mary", { month: 12, day: 8 }),
  marian("the-immaculate-heart-of-mary", "The Immaculate Heart of the Blessed Virgin Mary", { easterOffsetDays: 69 },
    "Common of the Blessed Virgin Mary; kept with the Sacred Heart."),

  // ─── Other Common Worship provisions (inline, or reusing a key) ───
  {
    key: "corpus-christi",
    kind: "transferred",
    easterOffsetDays: 60, // Thursday after Trinity Sunday
    name: "The Day of Thanksgiving for the Institution of Holy Communion (Corpus Christi)",
    colour: "WHITE",
    rite: "CW",
    readings: svc(
      [
        ["OLD_TESTAMENT", "Genesis 14.18-20"],
        ["PSALM", "Psalm 116.10-end"],
        ["NEW_TESTAMENT", "1 Corinthians 11.23-26"],
        ["GOSPEL", "John 6.51-58"],
      ],
      [
        ["OLD_TESTAMENT", "Proverbs 9.1-5"],
        ["GOSPEL", "Luke 9.11-17"],
      ],
    ),
  },
  {
    key: "all-souls",
    kind: "transferred",
    month: 11,
    day: 2,
    name: "The Commemoration of the Faithful Departed (All Souls' Day)",
    colour: "PURPLE",
    rite: "CW",
    note: "Purple (or black) vestments are traditional.",
    readings: svc([
      ["OLD_TESTAMENT", "Lamentations 3.17-26,31-33 or Wisdom 3.1-9"],
      ["PSALM", "Psalm 23 or Psalm 27.1-6,16,17"],
      ["NEW_TESTAMENT", "Romans 5.5-11 or 1 Peter 1.3-9"],
      ["GOSPEL", "John 5.19-25 or John 6.37-40"],
    ]),
  },
  {
    key: "the-holy-name-of-jesus",
    kind: "transferred",
    month: 8,
    day: 7,
    name: "The Holy Name of Jesus",
    colour: "WHITE",
    rite: "CW",
    lectionaryKey: "the-naming-and-circumcision-of-jesus",
    note: "Common Worship keeps the Holy Name on 1 January (the Naming of Jesus); 7 August is the traditional English (Sarum) date.",
  },

  // ─── Roman Rite feasts — no Common Worship provision ───
  {
    key: "the-most-sacred-heart-of-jesus",
    kind: "transferred",
    easterOffsetDays: 68, // Friday after Corpus Christi
    name: "The Most Sacred Heart of Jesus",
    colour: "WHITE",
    rite: "ROMAN",
    note: "Roman Rite — no Common Worship provision.",
    readings: {
      A: svc([
        ["OLD_TESTAMENT", "Deuteronomy 7.6-11"],
        ["PSALM", "Psalm 103"],
        ["NEW_TESTAMENT", "1 John 4.7-16"],
        ["GOSPEL", "Matthew 11.25-30"],
      ]),
      B: svc([
        ["OLD_TESTAMENT", "Hosea 11.1,3-4,8-9"],
        ["CANTICLE", "Isaiah 12.2-6"],
        ["NEW_TESTAMENT", "Ephesians 3.8-12,14-19"],
        ["GOSPEL", "John 19.31-37"],
      ]),
      C: svc([
        ["OLD_TESTAMENT", "Ezekiel 34.11-16"],
        ["PSALM", "Psalm 23"],
        ["NEW_TESTAMENT", "Romans 5.5b-11"],
        ["GOSPEL", "Luke 15.3-7"],
      ]),
    },
  },
  {
    key: "the-most-precious-blood-of-jesus",
    kind: "transferred",
    month: 7,
    day: 1,
    name: "The Most Precious Blood of Jesus",
    colour: "RED",
    rite: "ROMAN",
    note: "Roman Rite — no Common Worship provision.",
    readings: svc([
      ["NEW_TESTAMENT", "Hebrews 9.11-15"],
      ["GOSPEL", "John 19.30-35"],
    ]),
  },
  {
    key: "the-holy-guardian-angels",
    kind: "transferred",
    month: 10,
    day: 2,
    name: "The Holy Guardian Angels",
    colour: "WHITE",
    rite: "ROMAN",
    note: "Roman Rite — no Common Worship provision (Common Worship keeps Michael and All Angels on 29 September).",
    readings: svc([
      ["OLD_TESTAMENT", "Exodus 23.20-23a"],
      ["PSALM", "Psalm 91.1-6,10-11"],
      ["GOSPEL", "Matthew 18.1-5,10"],
    ]),
  },

  // ─── Same-Sunday alternate provisions ───
  // Mothering Sunday (Laetare) — alternative readings for the Fourth Sunday of Lent.
  { key: "mothering-sunday", kind: "alternate", appliesToSundayKey: "the-fourth-sunday-of-lent" },
  // The Holy Family overlays the First Sunday of Christmas (Roman, no CW proper).
  {
    key: "the-holy-family",
    kind: "alternate",
    appliesToSundayKey: "the-first-sunday-of-christmas",
    name: "The Holy Family",
    colour: "WHITE",
    rite: "ROMAN",
    note: "Roman Rite — kept on the First Sunday of Christmas.",
    readings: {
      A: svc([
        ["OLD_TESTAMENT", "Ecclesiasticus 3.2-6,12-14"],
        ["PSALM", "Psalm 128"],
        ["NEW_TESTAMENT", "Colossians 3.12-21"],
        ["GOSPEL", "Matthew 2.13-15,19-23"],
      ]),
      B: svc([
        ["OLD_TESTAMENT", "Genesis 15.1-6; 21.1-3"],
        ["PSALM", "Psalm 105.1-9"],
        ["NEW_TESTAMENT", "Hebrews 11.8,11-12,17-19"],
        ["GOSPEL", "Luke 2.22-40"],
      ]),
      C: svc([
        ["OLD_TESTAMENT", "1 Samuel 1.20-22,24-28"],
        ["PSALM", "Psalm 84"],
        ["NEW_TESTAMENT", "1 John 3.1-2,21-24"],
        ["GOSPEL", "Luke 2.41-52"],
      ]),
    },
  },

  // ─── Traditional-name emphases (title only; readings & colour unchanged) ───
  {
    key: "gaudete",
    kind: "emphasis",
    appliesToSundayKey: "the-third-sunday-of-advent",
    name: "Gaudete (The Third Sunday of Advent)",
    note: "Rose vestments may be worn (“Gaudete” — “Rejoice”).",
  },
  {
    key: "laetare",
    kind: "emphasis",
    appliesToSundayKey: "the-fourth-sunday-of-lent",
    name: "Laetare (The Fourth Sunday of Lent)",
    note: "Rose vestments may be worn (“Laetare”); also kept as Mothering Sunday.",
  },
  {
    key: "passion-sunday",
    kind: "emphasis",
    appliesToSundayKey: "the-fifth-sunday-of-lent",
    name: "Passion Sunday (The Fifth Sunday of Lent)",
    note: "Passiontide begins; crosses and images may be veiled.",
  },
  {
    key: "quinquagesima",
    kind: "emphasis",
    appliesToSundayKey: "the-sunday-next-before-lent",
    name: "Quinquagesima",
    note: "Traditional (Book of Common Prayer) name for the Sunday next before Lent.",
  },
  {
    key: "sexagesima",
    kind: "emphasis",
    appliesToSundayKey: "the-second-sunday-before-lent",
    name: "Sexagesima",
    note: "Traditional (Book of Common Prayer) name.",
  },
  {
    key: "low-sunday",
    kind: "emphasis",
    appliesToSundayKey: "the-second-sunday-of-easter",
    name: "Low Sunday (The Second Sunday of Easter)",
    note: "Traditional name for the Octave Day of Easter (also “Quasimodo”).",
  },
  {
    key: "stir-up-sunday",
    kind: "emphasis",
    appliesToSundayKey: "christ-the-king",
    name: "Stir-up Sunday (The Sunday next before Advent)",
    note: "Book of Common Prayer “Stir up” collect.",
  },
];
