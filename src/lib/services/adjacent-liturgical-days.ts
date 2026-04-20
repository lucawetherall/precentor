import { db } from "@/lib/db";
import { liturgicalDays } from "@/lib/db/schema";
import { asc, desc, gt, lt } from "drizzle-orm";

import type { AdjacentDayLinks } from "@/types/service-views";

/**
 * Given a YYYY-MM-DD date string, returns the nearest previous and next
 * `liturgicalDays.date` values (each as a YYYY-MM-DD string), or `null` at
 * calendar boundaries. `currentDate` does not need to exist in the table —
 * the queries use strict gt/lt, so the nearest day on each side is returned
 * regardless of whether the current date is a row.
 */
export async function getAdjacentLiturgicalDays(
  currentDate: string,
): Promise<AdjacentDayLinks> {
  const [nextRows, prevRows] = await Promise.all([
    db
      .select({ date: liturgicalDays.date })
      .from(liturgicalDays)
      .where(gt(liturgicalDays.date, currentDate))
      .orderBy(asc(liturgicalDays.date))
      .limit(1),
    db
      .select({ date: liturgicalDays.date })
      .from(liturgicalDays)
      .where(lt(liturgicalDays.date, currentDate))
      .orderBy(desc(liturgicalDays.date))
      .limit(1),
  ]);

  return {
    prev: prevRows[0]?.date ?? null,
    next: nextRows[0]?.date ?? null,
  };
}
