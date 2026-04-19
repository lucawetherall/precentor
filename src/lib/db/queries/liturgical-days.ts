import { db } from "@/lib/db";
import { liturgicalDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface EnsuredLiturgicalDay {
  id: string;
  date: string;
  created: boolean;
}

/**
 * Ensures a liturgical_days row exists for a given ISO date (YYYY-MM-DD).
 * Returns the existing row's id or creates a minimal placeholder.
 * Must be called inside a transaction.
 */
export async function ensureLiturgicalDay(
  tx: typeof db,
  date: string
): Promise<EnsuredLiturgicalDay> {
  const existing = await tx
    .select({ id: liturgicalDays.id, date: liturgicalDays.date })
    .from(liturgicalDays)
    .where(eq(liturgicalDays.date, date))
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, date: existing[0].date, created: false };
  }

  const [row] = await tx
    .insert(liturgicalDays)
    .values({
      date,
      season: "ORDINARY",
      colour: "GREEN",
      cwName: "Feria",
    })
    .returning({ id: liturgicalDays.id, date: liturgicalDays.date });

  return { id: row.id, date: row.date, created: true };
}
