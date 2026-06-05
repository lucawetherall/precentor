/**
 * Seed the database with lectionary data for the current and next church year.
 * Also creates default services for all churches with a defaultServices template.
 *
 * Usage: npm run db:seed
 */

import { db } from "@/lib/db";
import { churches, services, liturgicalDays } from "@/lib/db/schema";
import { seedLectionaryData } from "@/lib/lectionary/mapper";
import { getChurchYear } from "@/lib/lectionary/calendar";

interface DefaultService {
  type: "SUNG_EUCHARIST" | "CHORAL_EVENSONG" | "SAID_EUCHARIST" | "CHORAL_MATINS" | "FAMILY_SERVICE" | "COMPLINE";
  time: string;
}

interface ChurchSettings {
  defaultServices?: DefaultService[];
}

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

  console.log("Creating default services for churches...");
  const allChurches = await db.select().from(churches);
  const allDays = await db.select({ id: liturgicalDays.id }).from(liturgicalDays);

  let servicesCreated = 0;
  for (const church of allChurches) {
    const settings = church.settings as ChurchSettings | null;
    const defaults = settings?.defaultServices;
    if (!defaults || defaults.length === 0) continue;

    for (const day of allDays) {
      for (const svc of defaults) {
        try {
          await db
            .insert(services)
            .values({
              churchId: church.id,
              liturgicalDayId: day.id,
              serviceType: svc.type,
              time: svc.time,
              status: "DRAFT",
            })
            .onConflictDoNothing();
          servicesCreated++;
        } catch {
          // Skip duplicates silently
        }
      }
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
