/**
 * Liturgical calendar engine.
 *
 * Local Easter computation (Oudin's method per oremus.org/easter/computus).
 *
 * Computes all Sundays and major feasts for a given church year,
 * returning entries that map to keys in lectionary-coe.json.
 */

import { addDays, format, eachDayOfInterval, isSunday, getDay } from "date-fns";
import { logger } from "@/lib/logger";
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

// ─── Local calendar computation ─────────────────────────────────

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

/**
 * Compute the full liturgical calendar locally without any API dependency.
 * This maps every Sunday and key feast to its lectionary JSON key.
 */
export function computeLiturgicalCalendar(
  churchYear: { startYear: number; endYear: number },
): LiturgicalDateEntry[] {
  const entries: LiturgicalDateEntry[] = [];
  const year = churchYear.endYear; // Calendar year for Easter etc.

  const adventStart = computeAdventStart(churchYear.startYear);
  const nextAdvent = computeAdventStart(churchYear.endYear);
  const easter = computeEasterDate(year);
  const ashWed = addDays(easter, -46);
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

  logger.info("Computed liturgical date entries locally", { count: entries.length });

  return entries;
}
