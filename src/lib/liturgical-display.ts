/**
 * Display utilities for liturgical day names.
 * Uses an inlined Easter algorithm to avoid importing the large lectionary JSON.
 */

const SUNDAY_BETWEEN_RE = /Sunday between/i;

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth",
  "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth",
  "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth",
  "Eighteenth", "Nineteenth", "Twentieth", "Twenty-first", "Twenty-second",
  "Twenty-third", "Twenty-fourth",
];

/** Compute Easter Sunday for a given year (Anonymous Gregorian / Oudin's method). */
function easterDate(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based month
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Add days to a Date, returning a new Date. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Convert a CW date-range Sunday name to "The Nth Sunday after Trinity".
 * Returns the original name if it doesn't match the pattern or is pre-Trinity.
 *
 * @param cwName  e.g. "Sunday between 3 and 9 July inclusive"
 * @param date    ISO date string "YYYY-MM-DD"
 */
export function formatLiturgicalDayName(cwName: string, date: string): string {
  if (!SUNDAY_BETWEEN_RE.test(cwName)) return cwName;

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-based
  const day = parseInt(dayStr, 10);
  const dateObj = new Date(year, month, day);

  const easter = easterDate(year);
  const trinity = addDays(easter, 56);

  const diffMs = dateObj.getTime() - trinity.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays <= 0) {
    // Pre-Trinity: could be Epiphany-season Ordinary Time — leave as-is for now
    return cwName;
  }

  const weekNum = Math.round(diffDays / 7);
  const ordinal = ORDINALS[weekNum - 1];
  if (!ordinal) return cwName;

  return `The ${ordinal} Sunday after Trinity`;
}
