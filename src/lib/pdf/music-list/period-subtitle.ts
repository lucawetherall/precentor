import { parseISO, format } from "date-fns";

/**
 * Format the human-readable period subtitle shown under the masthead.
 *
 * Rules:
 *  - same month/year → "May 2026"
 *  - same year, spans ≤ 2 calendar months → "May & June 2026"
 *  - same year, spans > 2 months → "May – August 2026"
 *  - cross year, spans ≤ 2 months → "December 2025 & January 2026"
 *  - cross year, spans > 2 months → "December 2025 – February 2026"
 */
export function formatPeriodSubtitle(fromISO: string, toISO: string): string {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);

  const fromMonth = format(from, "LLLL");
  const toMonth = format(to, "LLLL");
  const fromYear = from.getFullYear();
  const toYear = to.getFullYear();
  const fromMonthIdx = from.getMonth();
  const toMonthIdx = to.getMonth();

  // Same month & year
  if (fromYear === toYear && fromMonthIdx === toMonthIdx) {
    return `${fromMonth} ${fromYear}`;
  }

  // Same year
  if (fromYear === toYear) {
    const monthSpan = toMonthIdx - fromMonthIdx + 1;
    if (monthSpan <= 2) {
      return `${fromMonth} & ${toMonth} ${fromYear}`;
    }
    return `${fromMonth} \u2013 ${toMonth} ${fromYear}`;
  }

  // Cross year: calculate month span across years
  const monthSpan = (toYear - fromYear) * 12 + (toMonthIdx - fromMonthIdx) + 1;
  if (monthSpan <= 2) {
    return `${fromMonth} ${fromYear} & ${toMonth} ${toYear}`;
  }
  return `${fromMonth} ${fromYear} \u2013 ${toMonth} ${toYear}`;
}
