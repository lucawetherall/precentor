import { addDays, format, getDay, isAfter, parseISO } from "date-fns";
import { db } from "@/lib/db";
import {
  churchServicePatterns,
  churchServicePresets,
  services,
  serviceSections,
  musicSlots,
  musicSlotTypeEnum,
  liturgicalDays,
  presetRoleSlots,
  serviceRoleSlots,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { resolveTemplateSections } from "@/lib/services/template-resolution";
import { applySeasonalRules } from "@/lib/services/seasonal-rules";
import type { InsertServiceSection } from "@/lib/services/seasonal-rules";

export async function generateServicesForChurch(
  churchId: string,
  fromDate: string,
  toDate: string,
): Promise<{ created: number }> {
  // 1. Load enabled patterns for the church, joining their preset for serviceType+time
  const patterns = await db
    .select({
      id: churchServicePatterns.id,
      churchId: churchServicePatterns.churchId,
      dayOfWeek: churchServicePatterns.dayOfWeek,
      presetId: churchServicePatterns.presetId,
      enabled: churchServicePatterns.enabled,
      serviceType: churchServicePresets.serviceType,
      time: churchServicePresets.defaultTime,
    })
    .from(churchServicePatterns)
    .innerJoin(churchServicePresets, eq(churchServicePatterns.presetId, churchServicePresets.id))
    .where(
      and(
        eq(churchServicePatterns.churchId, churchId),
        eq(churchServicePatterns.enabled, true),
      ),
    );

  if (patterns.length === 0) return { created: 0 };

  // 2. Load liturgical days in the date range
  const days = await db
    .select()
    .from(liturgicalDays)
    .where(
      and(
        gte(liturgicalDays.date, fromDate),
        lte(liturgicalDays.date, toDate),
      ),
    );

  // 2b. Patterns can target weekdays, but the calendar seed covers Sundays and
  //     major feasts only — a Wednesday-Evensong pattern would otherwise
  //     generate nothing. Create minimal Feria placeholders for any
  //     pattern-matching date with no calendar row (the same shape the
  //     planning grid's ensureLiturgicalDay creates on demand).
  const seenDates = new Set(days.map((d) => d.date));
  const wantedDows = new Set(patterns.map((p) => p.dayOfWeek));
  const missingDates: string[] = [];
  const rangeEnd = parseISO(toDate);
  for (let d = parseISO(fromDate); !isAfter(d, rangeEnd); d = addDays(d, 1)) {
    if (!wantedDows.has(getDay(d))) continue;
    const iso = format(d, "yyyy-MM-dd");
    if (!seenDates.has(iso)) missingDates.push(iso);
  }
  if (missingDates.length > 0) {
    const inserted = await db
      .insert(liturgicalDays)
      .values(
        missingDates.map((date) => ({
          date,
          season: "ORDINARY" as const,
          colour: "GREEN" as const,
          cwName: "Feria",
        })),
      )
      .onConflictDoNothing()
      .returning();
    days.push(...inserted);
    // Rows lost to a concurrent insert land here — fetch them instead.
    const insertedDates = new Set(inserted.map((d) => d.date));
    const racedDates = missingDates.filter((d) => !insertedDates.has(d));
    if (racedDates.length > 0) {
      days.push(
        ...(await db
          .select()
          .from(liturgicalDays)
          .where(inArray(liturgicalDays.date, racedDates))),
      );
    }
  }

  if (days.length === 0) return { created: 0 };

  // Build a cache: serviceType → resolved template sections (avoids N+1 per day)
  const templateCache = new Map<string, Awaited<ReturnType<typeof resolveTemplateSections>>>();
  for (const pattern of patterns) {
    if (!templateCache.has(pattern.serviceType)) {
      templateCache.set(pattern.serviceType, await resolveTemplateSections(churchId, pattern.serviceType));
    }
  }

  // 3. Build the candidate service rows (pattern × matching day) up front so
  //    they can be inserted in one batched statement rather than one round-trip
  //    per pair. Dedupe on the (liturgicalDayId, serviceType) unique key,
  //    keeping the first pattern — matching the old loop's ON-CONFLICT order so
  //    a single INSERT can't collide with itself.
  const daysById = new Map(days.map((d) => [d.id, d]));
  const candidates: (typeof services.$inferInsert)[] = [];
  const seen = new Set<string>();
  for (const pattern of patterns) {
    for (const day of days) {
      if (getDay(parseISO(day.date)) !== pattern.dayOfWeek) continue;
      const key = `${day.id}:${pattern.serviceType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        churchId,
        liturgicalDayId: day.id,
        serviceType: pattern.serviceType,
        time: pattern.time ?? null,
        presetId: pattern.presetId,
      });
    }
  }

  if (candidates.length === 0) return { created: 0 };

  // 4. Insert every candidate in one statement. ON CONFLICT DO NOTHING skips
  //    services that already exist, and `returning` gives back only the rows
  //    that were actually created — which is also the `created` count.
  const insertedServices = await db
    .insert(services)
    .values(candidates)
    .onConflictDoNothing()
    .returning({
      id: services.id,
      liturgicalDayId: services.liturgicalDayId,
      serviceType: services.serviceType,
      presetId: services.presetId,
    });

  if (insertedServices.length === 0) return { created: 0 };

  // Snapshot each preset's role slots onto the created services — the same
  // copy the manual create route performs. Without it the rota/availability
  // feature is inert for generated services (the availability API requires a
  // matching service_role_slots row).
  const presetIds = [
    ...new Set(
      insertedServices
        .map((s) => s.presetId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const allRoleSlots: (typeof serviceRoleSlots.$inferInsert)[] = [];
  if (presetIds.length > 0) {
    const presetSlots = await db
      .select()
      .from(presetRoleSlots)
      .where(inArray(presetRoleSlots.presetId, presetIds));
    const slotsByPreset = new Map<string, typeof presetSlots>();
    for (const slot of presetSlots) {
      const group = slotsByPreset.get(slot.presetId) ?? [];
      group.push(slot);
      slotsByPreset.set(slot.presetId, group);
    }
    for (const svc of insertedServices) {
      if (!svc.presetId) continue;
      for (const slot of slotsByPreset.get(svc.presetId) ?? []) {
        allRoleSlots.push({
          serviceId: svc.id,
          catalogRoleId: slot.catalogRoleId,
          minCount: slot.minCount,
          maxCount: slot.maxCount,
          exclusive: slot.exclusive,
          displayOrder: slot.displayOrder,
        });
      }
    }
  }

  // 5. Build the sections (and any music slots they own) for every created
  //    service, accumulating into two flat arrays. Music-slot ids are generated
  //    client-side so a section can reference its slot without a per-slot
  //    INSERT ... RETURNING round-trip.
  const allSlots: (typeof musicSlots.$inferInsert)[] = [];
  const allSections: (typeof serviceSections.$inferInsert)[] = [];

  for (const svc of insertedServices) {
    const day = daysById.get(svc.liturgicalDayId);
    if (!day) continue;
    const templateSectionsRaw = templateCache.get(svc.serviceType) ?? [];
    if (templateSectionsRaw.length === 0) continue;

    const mappedSections: InsertServiceSection[] = templateSectionsRaw.map(
      (section, i) => ({
        serviceId: svc.id,
        sectionKey: section.sectionKey,
        title: section.title,
        majorSection: section.majorSection ?? null,
        positionOrder: section.positionOrder ?? i,
        liturgicalTextId: section.liturgicalTextId ?? null,
        musicSlotType:
          (section.musicSlotType as InsertServiceSection["musicSlotType"]) ??
          null,
        placeholderType: section.placeholderType ?? null,
        visible: true,
      }),
    );

    const finalSections = applySeasonalRules(mappedSections, day.season);

    for (const section of finalSections) {
      let musicSlotId: string | null = null;
      if (section.musicSlotType) {
        musicSlotId = crypto.randomUUID();
        allSlots.push({
          id: musicSlotId,
          serviceId: svc.id,
          slotType:
            section.musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number],
          positionOrder: section.positionOrder,
        });
      }
      allSections.push({ ...section, musicSlotId });
    }
  }

  // 6. Persist role slots, music slots, then sections (sections FK-reference
  //    slots) in one transaction, so the whole generation run is atomic
  //    instead of one transaction per service.
  if (allSections.length > 0 || allRoleSlots.length > 0) {
    await db.transaction(async (tx) => {
      if (allRoleSlots.length > 0) {
        await tx.insert(serviceRoleSlots).values(allRoleSlots);
      }
      if (allSlots.length > 0) {
        await tx.insert(musicSlots).values(allSlots);
      }
      if (allSections.length > 0) {
        await tx.insert(serviceSections).values(allSections);
      }
    });
  }

  return { created: insertedServices.length };
}
