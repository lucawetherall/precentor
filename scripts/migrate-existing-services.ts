/**
 * Migrate existing services to use service_sections.
 *
 * For each service that has NO service_sections rows:
 * 1. Call resolveTemplateSections(churchId, serviceType) to get the template.
 * 2. Copy template sections into service_sections for that service.
 * 3. Link existing music_slots to matching service_sections by musicSlotType.
 * 4. Migrate services.eucharisticPrayer letter (e.g. "B") to eucharisticPrayerId FK.
 * 5. Log migration summary.
 *
 * Idempotent: skips services that already have sections.
 *
 * Usage: npm run db:migrate-services
 */

import "dotenv/config";
import { db } from "@/lib/db";
import {
  services,
  musicSlots,
  eucharisticPrayers,
} from "@/lib/db/schema-base";
import { serviceSections } from "@/lib/db/schema-liturgy";
import { eq, isNull, and } from "drizzle-orm";
import { resolveTemplateSections } from "@/lib/services/template-resolution";

// ─── Summary counters ─────────────────────────────────────────

let totalServices = 0;
let skipped = 0;
let migrated = 0;
let errors = 0;
let totalSectionsCreated = 0;
let totalMusicSlotsLinked = 0;
let totalPrayersMigrated = 0;
let totalMusicSlotTypesBackfilled = 0;

// ─── Main ─────────────────────────────────────────────────────

async function run() {
  console.log("Starting service migration…\n");

  // Load all services
  const allServices = await db.select().from(services);
  totalServices = allServices.length;
  console.log(`Found ${totalServices} service(s) total.\n`);

  for (const service of allServices) {
    try {
      await migrateService(service);
    } catch (err) {
      console.error(`  ERROR migrating service ${service.id}: ${err}`);
      errors++;
    }
  }

  // Print summary
  console.log("\n─────────────────────────────────────────");
  console.log("Migration summary:");
  console.log(`  Total services:       ${totalServices}`);
  console.log(`  Already had sections: ${skipped}`);
  console.log(`  Migrated:             ${migrated}`);
  console.log(`  Errors:               ${errors}`);
  console.log(`  Sections created:     ${totalSectionsCreated}`);
  console.log(`  Music slots linked:   ${totalMusicSlotsLinked}`);
  console.log(`  Prayers migrated:     ${totalPrayersMigrated}`);
  console.log(`  musicSlotType backfilled: ${totalMusicSlotTypesBackfilled}`);
}

async function migrateService(service: typeof services.$inferSelect) {
  const label = `[${service.id.slice(0, 8)}… ${service.serviceType}]`;

  // 1. Check if already has sections → skip
  const existingSections = await db
    .select({ id: serviceSections.id })
    .from(serviceSections)
    .where(eq(serviceSections.serviceId, service.id))
    .limit(1);

  if (existingSections.length > 0) {
    // Backfill musicSlotType for existing sections that have it NULL
    const sectionsNeedingType = await db
      .select({ id: serviceSections.id, sectionKey: serviceSections.sectionKey })
      .from(serviceSections)
      .where(
        and(
          eq(serviceSections.serviceId, service.id),
          isNull(serviceSections.musicSlotType),
        )
      );

    if (sectionsNeedingType.length > 0) {
      const templateSectionsForBackfill = await resolveTemplateSections(service.churchId, service.serviceType);
      const templateByKey = new Map(templateSectionsForBackfill.map((ts) => [ts.sectionKey, ts]));

      for (const section of sectionsNeedingType) {
        const template = templateByKey.get(section.sectionKey);
        if (template?.musicSlotType) {
          await db
            .update(serviceSections)
            .set({ musicSlotType: template.musicSlotType as any })
            .where(eq(serviceSections.id, section.id));
          totalMusicSlotTypesBackfilled++;
        }
      }
      console.log(`  BACKFILL ${label} — filled musicSlotType on ${totalMusicSlotTypesBackfilled} section(s)`);
    } else {
      console.log(`  SKIP ${label} — already has sections (musicSlotType already set)`);
    }

    skipped++;
    return;
  }

  console.log(`  MIGRATE ${label}`);

  // 2. Resolve template sections
  const templateSections = await resolveTemplateSections(service.churchId, service.serviceType);
  if (templateSections.length === 0) {
    console.log(`    No template found for ${service.serviceType} — skipping section creation`);
  }

  // 3. Fetch existing music slots for this service
  const existingSlots = await db
    .select()
    .from(musicSlots)
    .where(eq(musicSlots.serviceId, service.id));

  // Build a map of slotType → musicSlot id for linking
  // Note: there may be multiple slots of the same type (e.g. multiple HYMNs)
  // We link by first-match per type, then subsequent ones get no FK.
  const slotByType = new Map<string, string>();
  for (const slot of existingSlots) {
    const key = slot.slotType;
    if (!slotByType.has(key)) {
      slotByType.set(key, slot.id);
    }
  }

  // 4. Insert service_sections from template, linking music slots where possible
  const sectionsToInsert = templateSections.map((ts, i) => {
    // Match musicSlotType from template to existing music_slot slotType
    const linkedSlotId = ts.musicSlotType
      ? slotByType.get(ts.musicSlotType) ?? null
      : null;

    // If we consumed this slot, remove from map so duplicate sections get null
    if (linkedSlotId && ts.musicSlotType) {
      slotByType.delete(ts.musicSlotType);
    }

    return {
      serviceId: service.id,
      sectionKey: ts.sectionKey,
      title: ts.title,
      majorSection: ts.majorSection ?? null,
      positionOrder: i,
      liturgicalTextId: ts.liturgicalTextId ?? null,
      textOverride: null,
      musicSlotId: linkedSlotId,
      musicSlotType: ts.musicSlotType ?? null,
      placeholderType: ts.placeholderType ?? null,
      placeholderValue: null,
      visible: true,
    };
  });

  if (sectionsToInsert.length > 0) {
    await db.insert(serviceSections).values(sectionsToInsert);
    totalSectionsCreated += sectionsToInsert.length;
    const linked = sectionsToInsert.filter((s) => s.musicSlotId !== null).length;
    totalMusicSlotsLinked += linked;
    console.log(
      `    Created ${sectionsToInsert.length} section(s), linked ${linked} music slot(s)`
    );
  }

  // 5. Migrate eucharisticPrayer letter → eucharisticPrayerId
  if (service.eucharisticPrayer && !service.eucharisticPrayerId) {
    const letter = service.eucharisticPrayer.trim().toLowerCase();
    const prayerKey = `cw-${letter}`;

    const [prayer] = await db
      .select({ id: eucharisticPrayers.id })
      .from(eucharisticPrayers)
      .where(eq(eucharisticPrayers.key, prayerKey))
      .limit(1);

    if (prayer) {
      await db
        .update(services)
        .set({ eucharisticPrayerId: prayer.id })
        .where(eq(services.id, service.id));
      console.log(`    Migrated eucharisticPrayer "${service.eucharisticPrayer}" → ${prayer.id}`);
      totalPrayersMigrated++;
    } else {
      console.warn(`    WARNING: No prayer found for key "${prayerKey}"`);
    }
  }

  migrated++;
}

run()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
