import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { musicSlots, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const MAX_SLOTS = 100;
const MAX_FREE_TEXT_LEN = 500;
const MAX_NOTES_LEN = 1000;

const slotsPutSchema = z.object({
  slots: z
    .array(
      z.object({
        slotType: z.enum(musicSlotTypeEnum.enumValues, "Invalid slot type"),
        hymnId: z.string().optional(),
        anthemId: z.string().optional(),
        massSettingId: z.string().optional(),
        canticleSettingId: z.string().optional(),
        responsesSettingId: z.string().optional(),
        freeText: z.string().max(MAX_FREE_TEXT_LEN, `Slot freeText must be ${MAX_FREE_TEXT_LEN} characters or less`).optional(),
        notes: z.string().max(MAX_NOTES_LEN, `Slot notes must be ${MAX_NOTES_LEN} characters or less`).optional(),
      }),
    )
    .max(MAX_SLOTS, `Too many slots (max ${MAX_SLOTS})`)
    .optional()
    .default([]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
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

  const { data, error: bodyError } = await parseJsonBody(request, slotsPutSchema);
  if (bodyError) return bodyError;
  const { slots } = data;

  try {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(musicSlots).where(eq(musicSlots.serviceId, serviceId));

      if (slots.length > 0) {
        await tx.insert(musicSlots).values(
          slots.map((slot, i) => ({
            serviceId,
            slotType: slot.slotType,
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
