import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { musicSlots, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    // Verify the service belongs to this church
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const slots = await db
      .select()
      .from(musicSlots)
      .where(eq(musicSlots.serviceId, serviceId))
      .orderBy(musicSlots.positionOrder);

    return NextResponse.json(slots);
  } catch (error) {
    logger.error("Failed to fetch music slots", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { slots } = body;

  try {
    // Verify the service belongs to this church
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const MAX_SLOTS = 100;
    const MAX_FREE_TEXT_LEN = 500;
    const MAX_NOTES_LEN = 1000;

    // Validate slotType values and string lengths before writing
    if (slots && slots.length > 0) {
      if (slots.length > MAX_SLOTS) {
        return NextResponse.json(
          { error: `Too many slots (max ${MAX_SLOTS})` },
          { status: 400 }
        );
      }
      const validSlotTypes = musicSlotTypeEnum.enumValues;
      for (const slot of slots) {
        if (!validSlotTypes.includes(slot.slotType)) {
          return NextResponse.json(
            { error: `Invalid slot type: ${slot.slotType}` },
            { status: 400 }
          );
        }
        if (typeof slot.freeText === "string" && slot.freeText.length > MAX_FREE_TEXT_LEN) {
          return NextResponse.json(
            { error: `Slot freeText must be ${MAX_FREE_TEXT_LEN} characters or less` },
            { status: 400 }
          );
        }
        if (typeof slot.notes === "string" && slot.notes.length > MAX_NOTES_LEN) {
          return NextResponse.json(
            { error: `Slot notes must be ${MAX_NOTES_LEN} characters or less` },
            { status: 400 }
          );
        }
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(musicSlots).where(eq(musicSlots.serviceId, serviceId));

      if (slots && slots.length > 0) {
        await tx.insert(musicSlots).values(
          slots.map((slot: { slotType: string; hymnId?: string; anthemId?: string; massSettingId?: string; canticleSettingId?: string; responsesSettingId?: string; freeText?: string; notes?: string }, i: number) => ({
            serviceId,
            slotType: slot.slotType as (typeof musicSlotTypeEnum.enumValues)[number],
            positionOrder: i,
            hymnId: slot.hymnId || null,
            anthemId: slot.anthemId || null,
            massSettingId: slot.massSettingId || null,
            canticleSettingId: slot.canticleSettingId || null,
            responsesSettingId: slot.responsesSettingId || null,
            freeText: slot.freeText || null,
            notes: slot.notes || null,
          }))
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to save music slots", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
