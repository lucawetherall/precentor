import type { ReadingPosition } from "./bible-books";

export interface LectionaryReading {
  reference: string;
  position: ReadingPosition;
  bookName?: string;
}

export interface ServiceReadings {
  principal: LectionaryReading[];
  second: LectionaryReading[];
  third: LectionaryReading[];
}

export interface LectionarySunday {
  /** Section on the C of E page, e.g. "Advent", "Lent" */
  section: string;
  /** Full name, e.g. "The First Sunday of Advent" */
  name: string;
  /** Liturgical colour inferred from section */
  colour: string;
  /** Liturgical season mapped to enum */
  season: string;
  /** Collect prayer text (if scraped) */
  collect?: string;
  /** Post-communion prayer text (if scraped) */
  postCommunion?: string;
  /** Readings per year. Some feasts have all years the same. */
  years: {
    A?: ServiceReadings;
    B?: ServiceReadings;
    C?: ServiceReadings;
  };
}

export interface LectionaryData {
  /** Map of "YYYY/YYYY" church year to lectionary year A/B/C */
  yearMap: Record<string, "A" | "B" | "C">;
  /** Keyed by a normalized Sunday name (slug) */
  sundays: Record<string, LectionarySunday>;
}

export interface LiturgicalDateEntry {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Key into LectionaryData.sundays */
  sundayKey: string;
  /** Full display name */
  name: string;
  /** Liturgical season enum value */
  season: string;
  /** Liturgical colour enum value */
  colour: string;
}
