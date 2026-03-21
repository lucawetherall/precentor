/**
 * Liturgical calendar engine.
 *
 * Primary source: api.liturgical.uk (C of E liturgical calendar API)
 * Fallback: local Easter computation (Oudin's method per oremus.org/easter/computus)
 *
 * Computes all Sundays and major feasts for a given church year,
 * returning entries that map to keys in lectionary-coe.json.
 */

import { addDays, format, eachDayOfInterval, isSunday, getDay } from "date-fns";
import type { LiturgicalDateEntry } from "./types";
import lectionaryData from "../../data/lectionary-coe.json";

// ─── Easter computation (Oudin's method) ────────────────────────

/**
 * Compute Easter Sunday for a given year using the Anonymous Gregorian
 * algorithm (Oudin's method), per https://almanac.oremus.org/easter/computus/
 *
 * All division is integer division (Math.floor).
 */
export function computeEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Compute Advent Sunday (start of church year).
 * Advent Sunday is the Sunday nearest to 30 November,
 * always between 27 November and 3 December.
 */
export function computeAdventStart(year: number): Date {
  // St Andrew's Day is 30 November
  const nov30 = new Date(year, 10, 30); // month is 0-indexed
  const dayOfWeek = getDay(nov30); // 0=Sunday, 1=Monday, ...

  // Find the nearest Sunday
  if (dayOfWeek === 0) return nov30;
  if (dayOfWeek <= 3) {
    // Before or on Wednesday: go back to previous Sunday
    return addDays(nov30, -dayOfWeek);
  }
  // Thursday onwards: go forward to next Sunday
  return addDays(nov30, 7 - dayOfWeek);
}

/**
 * Determine which church year (Advent-to-Advent) a date falls in.
 * Returns the year in which the Advent Sunday fell.
 */
export function getChurchYear(date: Date): { startYear: number; endYear: number } {
  const year = date.getFullYear();
  const advent = computeAdventStart(year);

  if (date >= advent) {
    return { startYear: year, endYear: year + 1 };
  }
  return { startYear: year - 1, endYear: year };
}

/**
 * Determine the lectionary year (A, B, C) for a given church year.
 * Uses the year map from the scraped JSON, with a computed fallback.
 */
export function getLectionaryYear(
  churchYear: { startYear: number; endYear: number },
): "A" | "B" | "C" {
  const key = `${churchYear.startYear}/${churchYear.endYear}`;
  const data = lectionaryData as { yearMap: Record<string, string> };
  const mapped = data.yearMap[key];
  if (mapped === "A" || mapped === "B" || mapped === "C") return mapped;

  // Fallback: compute from the cycle pattern
  // The cycle is: A starts in years where (startYear % 3) === 1 (relative to 2001)
  // 2001/2002 = A, 2002/2003 = B, 2003/2004 = C, ...
  const mod = ((churchYear.startYear - 2001) % 3 + 3) % 3;
  return (["A", "B", "C"] as const)[mod];
}

// ─── Liturgical API integration ─────────────────────────────────

const LITURGICAL_API = "https://api.liturgical.uk";

interface LiturgicalApiResponse {
  date: string;
  name: string;
  season: string;
  colour: string;
  colourcode: string;
  week: string;
  type: string;
  prec: number;
  ember: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch liturgical data for a single date from api.liturgical.uk.
 * Includes retry logic for transient failures.
 */
async function fetchLiturgicalDate(
  date: string,
  retries = 2,
): Promise<LiturgicalApiResponse | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${LITURGICAL_API}/${date}`, {
        headers: { "Accept": "application/json" },
      });
      if (res.ok) {
        return (await res.json()) as LiturgicalApiResponse;
      }
      if (res.status === 429) {
        // Rate limited - wait longer
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return null;
    } catch {
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Map a liturgical API name to a key in our lectionary JSON.
 * The API returns names like "Advent 1", "Lent 5", "Easter 3"
 * while our JSON uses "the-first-sunday-of-advent", "the-fifth-sunday-of-lent", etc.
 */
function apiNameToSundayKey(
  apiData: LiturgicalApiResponse,
): string | null {
  const { name, season, type, week } = apiData;
  const nameLower = name.toLowerCase();

  // Direct name mapping for special days
  const DIRECT_MAP: Record<string, string> = {
    "christmas": "christmas-day",
    "epiphany": "the-epiphany",
    "candlemas": "candlemas",
    "ash wednesday": "ash-wednesday",
    "mothering sunday": "mothering-sunday",
    "palm sunday": "palm-sunday",
    "maundy thursday": "maundy-thursday",
    "good friday": "good-friday",
    "easter eve": "easter-eve",
    "holy saturday": "easter-eve",
    "easter": "easter-day",
    "ascension": "ascension-day",
    "pentecost": "day-of-pentecost-whit-sunday",
    "trinity": "trinity-sunday",
    "bible sunday": "bible-sunday",
    "christ the king": "christ-the-king",
    // Traditional names for numbered Sundays
    "advent sunday": "the-first-sunday-of-advent",
    "gaudete sunday": "the-third-sunday-of-advent",
    "laetare sunday": "the-fourth-sunday-of-lent",
    // Festivals
    "the naming and circumcision of jesus": "the-naming-and-circumcision-of-jesus",
    "the conversion of paul": "the-conversion-of-paul",
    "joseph of nazareth": "joseph-of-nazareth",
    "the annunciation of our lord": "the-annunciation-of-our-lord",
    "george": "george",
    "mark": "mark",
    "philip and james": "philip-and-james",
    "matthias": "matthias",
    "the visit of the blessed virgin mary to elizabeth": "the-visit-of-the-blessed-virgin-mary-to-elizabeth",
    "barnabas": "barnabas",
    "the birth of john the baptist": "the-birth-of-john-the-baptist",
    "peter and paul": "peter-and-paul",
    "thomas": "thomas",
    "mary magdalene": "mary-magdalene",
    "james": "james",
    "the transfiguration of our lord": "the-transfiguration-of-our-lord",
    "the blessed virgin mary": "the-blessed-virgin-mary",
    "bartholomew": "bartholomew",
    "holy cross day": "holy-cross-day",
    "matthew": "matthew",
    "michael and all angels": "michael-and-all-angels",
    "luke": "luke",
    "simon and jude": "simon-and-jude",
    "andrew": "andrew",
    "stephen": "stephen",
    "john": "john",
    "the holy innocents": "the-holy-innocents",
    "all saints": "all-saints-day",
    "all saints' day": "all-saints-day",
    "harvest thanksgiving": "harvest-thanksgiving",
  };

  if (DIRECT_MAP[nameLower]) return DIRECT_MAP[nameLower];

  // "Advent 1" -> "the-first-sunday-of-advent"
  const ordinals = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

  // Season + number pattern (e.g., "Advent 1", "Lent 2", "Easter 3")
  const seasonNumMatch = name.match(/^(\w+)\s+(\d+)$/);
  if (seasonNumMatch) {
    const [, seasonName, numStr] = seasonNumMatch;
    const num = parseInt(numStr, 10);
    const ordinal = ordinals[num - 1];

    if (seasonName === "Advent" && ordinal) {
      return `the-${ordinal}-sunday-of-advent`;
    }
    if (seasonName === "Christmas" && ordinal) {
      return `the-${ordinal}-sunday-of-christmas`;
    }
    if (seasonName === "Epiphany") {
      if (num === 1) return "the-baptism-of-christ";
      if (ordinal) return `the-${ordinal}-sunday-of-epiphany`;
    }
    if (seasonName === "Lent" && ordinal) {
      return `the-${ordinal}-sunday-of-lent`;
    }
    if (seasonName === "Easter" && ordinal) {
      if (num === 1) return "easter-day"; // Easter 1 = Easter Day
      if (num === 7) return "sunday-after-ascension-day"; // Easter 7 = Sunday after Ascension
      return `the-${ordinal}-sunday-of-easter`;
    }
  }

  // "Proper X" Sundays — mapped via date ranges in our JSON
  if (/proper/i.test(week)) {
    return null; // Handled by date-range matching in the caller
  }

  // Pre-Lent Sundays (API names: "2 before Lent", "1 before Lent", "next before Lent")
  if (nameLower === "2 before lent") return "the-second-sunday-before-lent";
  if (nameLower === "1 before lent" || nameLower === "next before lent") {
    return "the-sunday-next-before-lent";
  }

  // Pre-Advent Sundays
  if (nameLower === "4 before advent") return "the-fourth-sunday-before-advent";
  if (nameLower === "3 before advent") return "the-third-sunday-before-advent";
  if (nameLower === "2 before advent") return "the-second-sunday-before-advent";

  // Ordinary Time Sundays before Lent (Propers 1-3 can fall before Lent)
  // These are matched by date-range in the caller

  return null;
}

/**
 * For "Proper" Sundays (Ordinary Time after Trinity), find the matching
 * entry by checking date ranges in the JSON key.
 * E.g., the key "sunday-between-26-june-and-2-july-inclusive" matches a date of June 29.
 */
function findProperSundayKey(date: Date): string | null {
  const data = lectionaryData as { sundays: Record<string, { name: string }> };

  const monthNames: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  for (const [key, entry] of Object.entries(data.sundays)) {
    // Match both formats:
    //   "Sunday between 5 and 11 June inclusive" (same month)
    //   "Sunday between 29 May and 4 June inclusive" (different months)
    let sDay: number, sMonth: number, eDay: number, eMonth: number;

    const crossMonthMatch = entry.name.match(
      /Sunday between (\d+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+and\s+(\d+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i,
    );

    if (crossMonthMatch) {
      sDay = parseInt(crossMonthMatch[1], 10);
      sMonth = monthNames[crossMonthMatch[2].toLowerCase()];
      eDay = parseInt(crossMonthMatch[3], 10);
      eMonth = monthNames[crossMonthMatch[4].toLowerCase()];
    } else {
      const sameMonthMatch = entry.name.match(
        /Sunday between (\d+)\s+and\s+(\d+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i,
      );
      if (!sameMonthMatch) continue;

      sDay = parseInt(sameMonthMatch[1], 10);
      eDay = parseInt(sameMonthMatch[2], 10);
      sMonth = eMonth = monthNames[sameMonthMatch[3].toLowerCase()];
    }

    if (sMonth === undefined || eMonth === undefined) continue;

    const startDate = new Date(date.getFullYear(), sMonth, sDay);
    const endDate = new Date(date.getFullYear(), eMonth, eDay);

    if (date >= startDate && date <= endDate) {
      return key;
    }
  }

  return null;
}

// ─── Colour and season mapping ──────────────────────────────────

function mapApiColour(colour: string): string {
  const c = colour.toLowerCase();
  if (c === "purple" || c === "violet") return "PURPLE";
  if (c === "white" || c === "gold") return "WHITE";
  if (c === "red") return "RED";
  if (c === "green") return "GREEN";
  if (c === "rose" || c === "pink") return "ROSE";
  return "GREEN";
}

function mapApiSeason(season: string, name: string): string {
  const s = season.toLowerCase();
  const n = name.toLowerCase();

  if (s === "advent") return "ADVENT";
  if (s === "christmas") return "CHRISTMAS";
  if (s === "epiphany") return "EPIPHANY";
  if (s === "lent") return "LENT";
  if (s === "easter") return "EASTER";
  if (n.includes("ascension")) return "ASCENSION";
  if (n.includes("pentecost")) return "PENTECOST";
  if (n.includes("trinity")) return "TRINITY";
  if (n.includes("christ the king")) return "KINGDOM";
  if (n.includes("holy week") || n.includes("palm sunday") || n.includes("maundy") || n.includes("good friday")) {
    return "HOLY_WEEK";
  }
  return "ORDINARY";
}

// ─── Local calendar computation ─────────────────────────────────

/**
 * Compute the full liturgical calendar locally without any API dependency.
 * This maps every Sunday and key feast to its lectionary JSON key.
 */
function computeLocalCalendar(
  churchYear: { startYear: number; endYear: number },
): LiturgicalDateEntry[] {
  const entries: LiturgicalDateEntry[] = [];
  const year = churchYear.endYear; // Calendar year for Easter etc.

  const adventStart = computeAdventStart(churchYear.startYear);
  const nextAdvent = computeAdventStart(churchYear.endYear);
  const easter = computeEasterDate(year);
  const ashWed = addDays(easter, -46);
  const palmSunday = addDays(easter, -7);
  const pentecost = addDays(easter, 49);
  const trinitySunday = addDays(easter, 56);
  const christmasDay = new Date(churchYear.startYear, 11, 25);

  function addEntry(date: Date, key: string, name: string, season: string, colour: string) {
    entries.push({ date: format(date, "yyyy-MM-dd"), sundayKey: key, name, season, colour });
  }

  // Walk each Sunday from Advent to next Advent
  let adventNum = 0;
  let christmasNum = 0;
  let epiphanyNum = 0;
  let lentNum = 0;
  let easterNum = 0;

  const allDates = eachDayOfInterval({
    start: adventStart,
    end: addDays(nextAdvent, -1),
  });

  // ─── Sundays ───
  const sundays = allDates.filter((d) => isSunday(d));
  const epiphanyDate = new Date(year, 0, 6);
  const candlemas = new Date(year, 1, 2);

  for (const sunday of sundays) {
    const d = sunday.getTime();

    // Advent Sundays (before Christmas)
    if (d < christmasDay.getTime()) {
      adventNum++;
      const ordinals = ["first", "second", "third", "fourth"];
      if (adventNum <= 4) {
        addEntry(sunday, `the-${ordinals[adventNum - 1]}-sunday-of-advent`,
          `The ${ordinals[adventNum - 1].charAt(0).toUpperCase() + ordinals[adventNum - 1].slice(1)} Sunday of Advent`,
          "ADVENT", "PURPLE");
      }
      continue;
    }

    // Christmas Sundays (Christmas to Epiphany)
    if (d >= christmasDay.getTime() && d < epiphanyDate.getTime()) {
      christmasNum++;
      const ordinals = ["first", "second"];
      if (christmasNum <= 2) {
        addEntry(sunday, `the-${ordinals[christmasNum - 1]}-sunday-of-christmas`,
          `The ${ordinals[christmasNum - 1].charAt(0).toUpperCase() + ordinals[christmasNum - 1].slice(1)} Sunday of Christmas`,
          "CHRISTMAS", "WHITE");
      }
      continue;
    }

    // Epiphany + pre-Lent Sundays (Epiphany to Ash Wednesday)
    if (d >= epiphanyDate.getTime() && d < ashWed.getTime()) {
      // The last two Sundays before Ash Wednesday are "before Lent" Sundays
      // Find the Sunday immediately before Ash Wed
      const sundayBeforeLent = addDays(ashWed, -(ashWed.getDay() || 7)); // Previous Sunday
      const secondBeforeLent = addDays(sundayBeforeLent, -7);

      if (d === sundayBeforeLent.getTime()) {
        addEntry(sunday, "the-sunday-next-before-lent", "The Sunday next before Lent", "ORDINARY", "GREEN");
        continue;
      }
      if (d === secondBeforeLent.getTime()) {
        addEntry(sunday, "the-second-sunday-before-lent", "The Second Sunday before Lent", "ORDINARY", "GREEN");
        continue;
      }

      // Regular Epiphany Sundays or Ordinary Time Propers
      epiphanyNum++;
      if (epiphanyNum === 1) {
        addEntry(sunday, "the-baptism-of-christ", "The Baptism of Christ", "EPIPHANY", "WHITE");
      } else if (epiphanyNum <= 4) {
        const ordinalMap: Record<number, string> = { 2: "second", 3: "third", 4: "fourth" };
        const ord = ordinalMap[epiphanyNum]!;
        addEntry(sunday, `the-${ord}-sunday-of-epiphany`,
          `The ${ord.charAt(0).toUpperCase() + ord.slice(1)} Sunday of Epiphany`,
          "EPIPHANY", "WHITE");
      } else {
        // Try matching as a Proper/date-range Sunday (Ordinary Time before Lent)
        const properKey = findProperSundayKey(sunday);
        if (properKey) {
          const lData = lectionaryData as { sundays: Record<string, { name: string }> };
          addEntry(sunday, properKey, lData.sundays[properKey]?.name || properKey, "ORDINARY", "GREEN");
        }
      }
      continue;
    }

    // Lent Sundays
    if (d >= ashWed.getTime() && d < easter.getTime()) {
      lentNum++;
      if (lentNum <= 5) {
        const ordinals = ["first", "second", "third", "fourth", "fifth"];
        addEntry(sunday, `the-${ordinals[lentNum - 1]}-sunday-of-lent`,
          `The ${ordinals[lentNum - 1].charAt(0).toUpperCase() + ordinals[lentNum - 1].slice(1)} Sunday of Lent`,
          "LENT", "PURPLE");
      } else {
        // Palm Sunday
        addEntry(sunday, "palm-sunday", "Palm Sunday", "HOLY_WEEK", "RED");
      }
      continue;
    }

    // Easter Sundays
    if (d >= easter.getTime() && d < pentecost.getTime()) {
      easterNum++;
      if (easterNum === 1) {
        addEntry(sunday, "easter-day", "Easter Day", "EASTER", "WHITE");
      } else if (easterNum <= 6) {
        const ordinalMap: Record<number, string> = { 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth" };
        const ord = ordinalMap[easterNum]!;
        addEntry(sunday, `the-${ord}-sunday-of-easter`,
          `The ${ord.charAt(0).toUpperCase() + ord.slice(1)} Sunday of Easter`,
          "EASTER", "WHITE");
      } else {
        addEntry(sunday, "sunday-after-ascension-day", "Sunday after Ascension Day", "EASTER", "WHITE");
      }
      continue;
    }

    // Pentecost
    if (d === pentecost.getTime()) {
      addEntry(sunday, "day-of-pentecost-whit-sunday", "Day of Pentecost (Whit Sunday)", "PENTECOST", "RED");
      continue;
    }

    // Trinity Sunday
    if (d === trinitySunday.getTime()) {
      addEntry(sunday, "trinity-sunday", "Trinity Sunday", "TRINITY", "WHITE");
      continue;
    }

    // Ordinary Time after Trinity (Proper Sundays) — through to Advent
    if (d > trinitySunday.getTime() && d < nextAdvent.getTime()) {
      // Count weeks before Advent for the pre-Advent Sundays
      const weeksBeforeAdvent = Math.ceil((nextAdvent.getTime() - d) / (7 * 24 * 60 * 60 * 1000));

      if (weeksBeforeAdvent === 1) {
        addEntry(sunday, "christ-the-king", "Christ the King", "KINGDOM", "WHITE");
      } else if (weeksBeforeAdvent === 2) {
        addEntry(sunday, "the-second-sunday-before-advent", "The Second Sunday before Advent", "ORDINARY", "GREEN");
      } else if (weeksBeforeAdvent === 3) {
        addEntry(sunday, "the-third-sunday-before-advent", "The Third Sunday before Advent", "ORDINARY", "GREEN");
      } else if (weeksBeforeAdvent === 4) {
        addEntry(sunday, "the-fourth-sunday-before-advent", "The Fourth Sunday before Advent", "ORDINARY", "GREEN");
      } else if (weeksBeforeAdvent === 5) {
        addEntry(sunday, "bible-sunday", "Bible Sunday", "ORDINARY", "GREEN");
      } else {
        // Proper Sundays — match by date range
        const properKey = findProperSundayKey(sunday);
        if (properKey) {
          const data = lectionaryData as { sundays: Record<string, { name: string }> };
          addEntry(sunday, properKey, data.sundays[properKey]?.name || properKey, "ORDINARY", "GREEN");
        }
      }
      continue;
    }
  }

  // ─── Fixed feasts (weekday) ───
  const weekdayFeasts: [Date, string, string, string, string][] = [
    [christmasDay, "christmas-day", "Christmas Day", "CHRISTMAS", "WHITE"],
    [new Date(year, 0, 1), "the-naming-and-circumcision-of-jesus", "The Naming and Circumcision of Jesus", "CHRISTMAS", "WHITE"],
    [epiphanyDate, "the-epiphany", "The Epiphany", "EPIPHANY", "WHITE"],
    [ashWed, "ash-wednesday", "Ash Wednesday", "LENT", "PURPLE"],
    [addDays(easter, -3), "maundy-thursday", "Maundy Thursday", "HOLY_WEEK", "WHITE"],
    [addDays(easter, -2), "good-friday", "Good Friday", "HOLY_WEEK", "RED"],
    [addDays(easter, -1), "easter-eve", "Easter Eve", "EASTER", "WHITE"],
    [addDays(easter, 39), "ascension-day", "Ascension Day", "ASCENSION", "WHITE"],
  ];

  for (const [date, key, name, season, colour] of weekdayFeasts) {
    if (!isSunday(date) && date >= adventStart && date < nextAdvent) {
      addEntry(date, key, name, season, colour);
    }
  }

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

// ─── Main calendar computation ──────────────────────────────────

/**
 * Generate all liturgical dates for a church year.
 * Uses local computation (reliable, no external dependency),
 * optionally enriched with api.liturgical.uk data for display names.
 */
export async function computeLiturgicalCalendar(
  churchYear: { startYear: number; endYear: number },
  options?: { useApi?: boolean },
): Promise<LiturgicalDateEntry[]> {
  const entries = computeLocalCalendar(churchYear);
  console.log(`Computed ${entries.length} liturgical date entries locally`);

  if (options?.useApi) {
    console.log("Enriching with api.liturgical.uk data...");
    let apiFailures = 0;
    for (let idx = 0; idx < entries.length; idx++) {
      if (apiFailures >= 3) break;
      if (idx > 0) await sleep(500);

      const apiData = await fetchLiturgicalDate(entries[idx].date);
      if (apiData) {
        entries[idx].name = apiData.name;
        entries[idx].season = mapApiSeason(apiData.season, apiData.name);
        entries[idx].colour = mapApiColour(apiData.colour);
      } else {
        apiFailures++;
      }
    }
  }

  return entries;
}
