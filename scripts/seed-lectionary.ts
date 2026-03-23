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

  const now = new Date();
  const currentYear = getChurchYear(now);
  const nextYear = { startYear: currentYear.endYear, endYear: currentYear.endYear + 1 };

  const result1 = await seedLectionaryData(currentYear);
  console.log(`Current year ${result1.churchYear} (Year ${result1.lectionaryYear}): ${result1.imported} days, ${result1.errors} errors`);

  const result2 = await seedLectionaryData(nextYear);
  console.log(`Next year ${result2.churchYear} (Year ${result2.lectionaryYear}): ${result2.imported} days, ${result2.errors} errors`);

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
