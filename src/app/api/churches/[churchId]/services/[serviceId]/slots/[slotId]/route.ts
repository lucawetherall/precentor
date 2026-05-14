import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { musicSlots, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const musicSlotUpdateSchema = z.object({
  verseCount: z.number().int().positive("verseCount must be a positive integer or null").nullable().optional(),
  selectedVerses: z.array(z.unknown()).nullable().optional(),
  hymnId: z.string("hymnId must be a string or null").nullable().optional(),
  anthemId: z.string("anthemId must be a string or null").nullable().optional(),
  massSettingId: z.string("massSettingId must be a string or null").nullable().optional(),
  freeText: z.string("freeText must be a string or null").max(1000, "freeText must be at most 1000 characters").nullable().optional(),
  notes: z.string("notes must be a string or null").max(5000, "notes must be at most 5000 characters").nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> }
) {
  const { churchId, serviceId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, musicSlotUpdateSchema);
  if (bodyError) return bodyError;

  try {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const [existing] = await db
      .select({ id: musicSlots.id })
      .from(musicSlots)
      .where(and(eq(musicSlots.id, slotId), eq(musicSlots.serviceId, serviceId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // Forward only fields that were explicitly present so nullable columns can
    // be cleared (null) independently of being left unchanged (undefined).
    const updates: Record<string, unknown> = {};
    if (data.verseCount !== undefined) updates.verseCount = data.verseCount;
    if (data.selectedVerses !== undefined) updates.selectedVerses = data.selectedVerses;
    if (data.hymnId !== undefined) updates.hymnId = data.hymnId;
    if (data.anthemId !== undefined) updates.anthemId = data.anthemId;
    if (data.massSettingId !== undefined) updates.massSettingId = data.massSettingId;
    if (data.freeText !== undefined) updates.freeText = data.freeText;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(musicSlots)
      .set(updates)
      .where(and(eq(musicSlots.id, slotId), eq(musicSlots.serviceId, serviceId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("Failed to update music slot", err);
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}
