import { db } from "@/lib/db";
import { liturgicalDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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
  tx: DbOrTx,
  date: string
): Promise<EnsuredLiturgicalDay> {
  // `date` is unique, so insert with conflict handling instead of
  // select-then-insert — two concurrent calls for the same date would
  // otherwise both miss the select and one insert would blow up with a
  // unique-violation (surfacing as a 500).
  const inserted = await tx
    .insert(liturgicalDays)
    .values({
      date,
      season: "ORDINARY",
      colour: "GREEN",
      cwName: "Feria",
    })
    .onConflictDoNothing({ target: liturgicalDays.date })
    .returning({ id: liturgicalDays.id, date: liturgicalDays.date });

  if (inserted.length > 0) {
    return { id: inserted[0].id, date: inserted[0].date, created: true };
  }

  // Conflict: the row already existed (or a concurrent transaction won the
  // race) — re-select it.
  const [existing] = await tx
    .select({ id: liturgicalDays.id, date: liturgicalDays.date })
    .from(liturgicalDays)
    .where(eq(liturgicalDays.date, date))
    .limit(1);

  if (!existing) {
    throw new Error(`liturgical day ${date} not found after insert conflict`);
  }

  return { id: existing.id, date: existing.date, created: false };
}
