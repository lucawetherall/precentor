/**
 * Seed the database with lectionary data for the current and next church year.
 * Also creates default services for all churches with a defaultServices template.
 *
 * Usage: npm run db:seed
 */

import { db } from "@/lib/db";
import { churches, liturgicalDays } from "@/lib/db/schema";
import { seedLectionaryData } from "@/lib/lectionary/mapper";
import { getChurchYear } from "@/lib/lectionary/calendar";
import { ensureQualifyingServices } from "@/lib/services/ensure-qualifying-services";
import { min, max } from "drizzle-orm";

async function main() {
  console.log("Seeding lectionary data...");

  // Seed two full lectionary cycles (A,B,C,A,B,C) starting from the current
  // church year. Liturgical days are keyed by date, so each church year adds a
  // distinct set of dated rows carrying that year's readings — no overwriting.
  // Re-run this to roll the window forward as years pass.
  const CYCLE_YEARS = 6;
  const now = new Date();
  let churchYear = getChurchYear(now);

  for (let i = 0; i < CYCLE_YEARS; i++) {
    const result = await seedLectionaryData(churchYear);
    console.log(`${result.churchYear} (Year ${result.lectionaryYear}): ${result.imported} days, ${result.errors} errors`);
    churchYear = { startYear: churchYear.endYear, endYear: churchYear.endYear + 1 };
  }

  console.log("Ensuring every church has a service for each Sunday / feast...");
  const allChurches = await db.select({ id: churches.id }).from(churches);
  // Backfill across the whole seeded window. ensureQualifyingServices is
  // idempotent and routes every row through a real preset, so it both fills new
  // churches and rolls the window forward on re-seed — replacing the old
  // bare-insert loop, which violated the services_preset_when_active check.
  const [bounds] = await db
    .select({ from: min(liturgicalDays.date), to: max(liturgicalDays.date) })
    .from(liturgicalDays);

  let servicesCreated = 0;
  if (bounds?.from && bounds?.to) {
    for (const church of allChurches) {
      const { created } = await ensureQualifyingServices(church.id, bounds.from, bounds.to);
      servicesCreated += created;
    }
  }

  console.log(`Created ${servicesCreated} services`);
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
