/**
 * Seed the database with CW collects from the liturgicalDays table.
 * For each liturgical day that has a non-null `collect`, inserts a row
 * into the `collects` table with rite "CW" and churchId null (system record).
 *
 * Idempotent: uses onConflictDoNothing (no unique constraint exists on the
 * table, so a re-run inserts duplicates — run only once against a fresh DB,
 * or wrap in a manual existence check if replays are needed).
 *
 * Usage: npm run db:seed-collects
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { collects, liturgicalDays } from "@/lib/db/schema-base";
import { isNotNull } from "drizzle-orm";

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  // Fetch all liturgical days that carry a collect text.
  const days = await db
    .select({
      id: liturgicalDays.id,
      cwName: liturgicalDays.cwName,
      collect: liturgicalDays.collect,
    })
    .from(liturgicalDays)
    .where(isNotNull(liturgicalDays.collect));

  console.log(`Found ${days.length} liturgical days with a collect.`);

  let inserted = 0;

  for (const day of days) {
    // collect is guaranteed non-null by the WHERE clause above,
    // but TypeScript doesn't narrow it through the select projection.
    const collectText = day.collect!;

    await db
      .insert(collects)
      .values({
        liturgicalDayId: day.id,
        rite: "CW",
        title: `Collect for ${day.cwName}`,
        text: collectText,
        churchId: null,
      })
      .onConflictDoNothing();

    inserted++;
    console.log(`  ✓ ${day.cwName}`);
  }

  console.log(`Seeded ${inserted} collects.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
