import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services, serviceTypeEnum, serviceSections, musicSlots, musicSlotTypeEnum, presetRoleSlots, serviceRoleSlots } from "@/lib/db/schema";
import { resolveTemplateSections } from "@/lib/services/template-resolution";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { liturgicalDayId, serviceType, time, presetId } = body as {
    liturgicalDayId?: unknown;
    serviceType?: unknown;
    time?: unknown;
    presetId?: unknown;
  };

  if (!liturgicalDayId || typeof liturgicalDayId !== "string") {
    return NextResponse.json({ error: "liturgicalDayId is required" }, { status: 400 });
  }
  if (!serviceType || !(serviceTypeEnum.enumValues as readonly string[]).includes(serviceType as string)) {
    return NextResponse.json(
      { error: `serviceType must be one of: ${serviceTypeEnum.enumValues.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const service = await db.transaction(async (tx) => {
      const [created] = await tx.insert(services).values({
        churchId,
        liturgicalDayId: liturgicalDayId as string,
        serviceType: serviceType as (typeof serviceTypeEnum.enumValues)[number],
        time: (time as string) || null,
        presetId: (presetId as string) || null,
      }).returning();

      // Snapshot preset role slots if a presetId was provided
      if (presetId) {
        const slots = await tx.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, presetId as string));
        if (slots.length > 0) {
          await tx.insert(serviceRoleSlots).values(slots.map((s) => ({
            serviceId: created.id,
            catalogRoleId: s.catalogRoleId,
            minCount: s.minCount,
            maxCount: s.maxCount,
            exclusive: s.exclusive,
            displayOrder: s.displayOrder,
          })));
        }
      }

      // Copy template sections for the new service
      const templateSections = await resolveTemplateSections(churchId, serviceType as string);

      if (templateSections.length > 0) {
        // Insert music slots for sections that need them, then link back via musicSlotId
        const sectionValues = await Promise.all(
          templateSections.map(async (section, i) => {
            let musicSlotId: string | null = null;

            if (section.musicSlotType) {
              const [slot] = await tx.insert(musicSlots).values({
                serviceId: created.id,
                slotType: section.musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number],
                positionOrder: section.positionOrder ?? i,
              }).returning({ id: musicSlots.id });
              musicSlotId = slot.id;
            }

            return {
              serviceId: created.id,
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

        if (sectionValues.length > 0) {
          await tx.insert(serviceSections).values(sectionValues);
        }
      }

      return created;
    });

    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    logger.error("Failed to create service", err);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
