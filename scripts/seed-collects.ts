/**
 * Seed the database with CW collects from the liturgicalDays table.
 * For each liturgical day that has a non-null `collect`, inserts a row
 * into the `collects` table with rite "CW" and churchId null (system record).
 *
 * NOTE: The `liturgical_days.collect` column is currently always NULL because
 * the lectionary source data (src/data/lectionary-coe.json) does not contain
 * collect text. This means this script will seed 0 collects until the source
 * data is populated. Collects must be populated manually or via a future
 * scrape of the Church of England website or another authoritative source.
 *
 * Idempotent: uses onConflictDoUpdate targeting the unique index
 * (liturgicalDayId, rite, churchId) added to the collects table.
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

  if (days.length === 0) {
    console.warn(
      "WARNING: No liturgical days with collect text were found.\n" +
      "  The liturgical_days.collect column is currently always NULL because\n" +
      "  the source data (src/data/lectionary-coe.json) does not include collect\n" +
      "  text. Collects must be populated manually or via a future scrape before\n" +
      "  this script can seed any data."
    );
    process.exit(0);
  }

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
      .onConflictDoUpdate({
        target: [collects.liturgicalDayId, collects.rite, collects.churchId],
        set: {
          title: `Collect for ${day.cwName}`,
          text: collectText,
        },
      });

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
