import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services, serviceTypeEnum, serviceSections, musicSlots, musicSlotTypeEnum } from "@/lib/db/schema";
import { resolveTemplateSections } from "@/lib/services/template-resolution";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { liturgicalDayId, serviceType, time } = body;

  if (!liturgicalDayId || typeof liturgicalDayId !== "string") {
    return NextResponse.json({ error: "liturgicalDayId is required" }, { status: 400 });
  }
  if (!serviceType || !(serviceTypeEnum.enumValues as readonly string[]).includes(serviceType)) {
    return NextResponse.json(
      { error: `serviceType must be one of: ${serviceTypeEnum.enumValues.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const [service] = await db.insert(services).values({
      churchId,
      liturgicalDayId,
      serviceType: serviceType as (typeof serviceTypeEnum.enumValues)[number],
      time: time || null,
    }).returning();

    // Copy template sections for the new service
    const templateSections = await resolveTemplateSections(churchId, serviceType);

    if (templateSections.length > 0) {
      // Insert music slots for sections that need them, then link back via musicSlotId
      const sectionValues = await Promise.all(
        templateSections.map(async (section, i) => {
          let musicSlotId: string | null = null;

          if (section.musicSlotType) {
            const [slot] = await db.insert(musicSlots).values({
              serviceId: service.id,
              slotType: section.musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number],
              positionOrder: section.positionOrder ?? i,
            }).returning({ id: musicSlots.id });
            musicSlotId = slot.id;
          }

          return {
            serviceId: service.id,
            sectionKey: section.sectionKey,
            title: section.title,
            majorSection: section.majorSection ?? null,
            positionOrder: section.positionOrder ?? i,
            liturgicalTextId: section.liturgicalTextId ?? null,
            musicSlotId,
            musicSlotType: (section.musicSlotType as (typeof serviceSections.$inferInsert)["musicSlotType"]) ?? null,
            placeholderType: section.placeholderType ?? null,
            visible: true,
          };
        })
      );

      await db.insert(serviceSections).values(sectionValues);
    }

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    logger.error("Failed to create service", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
