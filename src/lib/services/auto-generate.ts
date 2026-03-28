import { getDay, parseISO } from "date-fns";
import { db } from "@/lib/db";
import {
  churchServicePatterns,
  services,
  serviceSections,
  musicSlots,
  musicSlotTypeEnum,
  liturgicalDays,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { resolveTemplateSections } from "@/lib/services/template-resolution";
import { applySeasonalRules } from "@/lib/services/seasonal-rules";
import type { InsertServiceSection } from "@/lib/services/seasonal-rules";

export async function generateServicesForChurch(
  churchId: string,
  fromDate: string,
  toDate: string,
): Promise<{ created: number }> {
  // 1. Load enabled patterns for the church
  const patterns = await db
    .select()
    .from(churchServicePatterns)
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

  if (days.length === 0) return { created: 0 };

  let created = 0;

  // 3-7. For each pattern × day, attempt to insert a service
  for (const pattern of patterns) {
    for (const day of days) {
      // Compute day of week from the date string
      const dayOfWeek = getDay(parseISO(day.date));

      if (dayOfWeek !== pattern.dayOfWeek) continue;

      // Attempt insert with ON CONFLICT DO NOTHING
      const inserted = await db
        .insert(services)
        .values({
          churchId,
          liturgicalDayId: day.id,
          serviceType: pattern.serviceType,
          time: pattern.time ?? null,
          choirStatus: "CHOIR_REQUIRED",
        })
        .onConflictDoNothing()
        .returning({ id: services.id });

      if (inserted.length === 0) continue;

      const serviceId = inserted[0].id;
      created++;

      // Resolve template sections and apply seasonal rules
      const templateSectionsRaw = await resolveTemplateSections(
        churchId,
        pattern.serviceType,
      );

      if (templateSectionsRaw.length === 0) continue;

      // Map ResolvedSection[] -> InsertServiceSection[]
      const mappedSections: InsertServiceSection[] = templateSectionsRaw.map(
        (section, i) => ({
          serviceId,
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

      // Insert music slots for sections that need them, then bulk-insert sections
      const sectionValues = await Promise.all(
        finalSections.map(async (section) => {
          let musicSlotId: string | null = null;

          if (section.musicSlotType) {
            const [slot] = await db
              .insert(musicSlots)
              .values({
                serviceId,
                slotType:
                  section.musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number],
                positionOrder: section.positionOrder,
              })
              .returning({ id: musicSlots.id });
            musicSlotId = slot.id;
          }

          return { ...section, musicSlotId };
        }),
      );

      await db.insert(serviceSections).values(sectionValues);
    }
  }

  return { created };
}
