/**
 * Returns true only for `YYYY-MM-DD` strings that name a real calendar date.
 *
 * A `^\d{4}-\d{2}-\d{2}$` regex only checks shape, so it happily accepts
 * impossible dates like `2024-02-30`, `2023-02-29`, or `2024-13-01`. Those
 * slip past validation and then blow up against the PostgreSQL DATE column.
 * Reconstructing the date in UTC and checking each field round-trips rejects
 * them. Assumes the input already matches the ISO shape.
 */
export function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
