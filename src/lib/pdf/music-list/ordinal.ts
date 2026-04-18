import { parseISO, format } from "date-fns";

export type OrdinalSuffix = "st" | "nd" | "rd" | "th";

export interface OrdinalParts {
  dayName: string; // "Sunday"
  dayNum: number; // 3
  ordinal: OrdinalSuffix; // "rd"
  month: string; // "May"
  year: number; // 2026
}

/**
 * Compute the English ordinal suffix for a day-of-month number.
 * 11, 12, 13 are always "th".
 * Otherwise last digit 1→st, 2→nd, 3→rd, else "th".
 */
export function ordinalSuffix(dayNum: number): OrdinalSuffix {
  const abs = Math.abs(dayNum);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  const lastDigit = abs % 10;
  if (lastDigit === 1) return "st";
  if (lastDigit === 2) return "nd";
  if (lastDigit === 3) return "rd";
  return "th";
}

/**
 * Parse an ISO date string (YYYY-MM-DD) and return the parts needed to render
 * a music-list-style service date: "Sunday 3rd May 2026".
 */
export function formatOrdinalParts(dateStr: string): OrdinalParts {
  const dt = parseISO(dateStr);
  const dayName = format(dt, "EEEE");
  const dayNum = Number(format(dt, "d"));
  const month = format(dt, "LLLL");
  const year = Number(format(dt, "yyyy"));
  return {
    dayName,
    dayNum,
    ordinal: ordinalSuffix(dayNum),
    month,
    year,
  };
}
