import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const sectionUpdateSchema = z.object({
  visible: z.boolean().optional(),
  textOverride: z
    .array(
      z.object({
        speaker: z.string().max(200),
        text: z.string().max(10_000),
      }),
    )
    .max(200, "textOverride must be null or an array (max 200) of { speaker: string ≤200, text: string ≤10000 }")
    .nullable()
    .optional(),
  title: z.string().min(1, "title must be a non-empty string of 500 characters or fewer").max(500, "title must be a non-empty string of 500 characters or fewer").optional(),
  placeholderValue: z.string().max(10_000, "placeholderValue must be null or a string of 10000 characters or fewer").nullable().optional(),
  notes: z.string().max(5000, "notes must be null or a string of 5000 characters or fewer").nullable().optional(),
  musicSlotType: z.enum(musicSlotTypeEnum.enumValues, "Invalid musicSlotType").nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; sectionId: string }> }
) {
  const { churchId, serviceId, sectionId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, sectionUpdateSchema);
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
      .select({ id: serviceSections.id })
      .from(serviceSections)
      .where(and(eq(serviceSections.id, sectionId), eq(serviceSections.serviceId, serviceId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Only forward fields that were actually present so callers can clear vs.
    // leave-unchanged for nullable columns.
    const updates: Record<string, unknown> = {};
    if (data.visible !== undefined) updates.visible = data.visible;
    if (data.textOverride !== undefined) updates.textOverride = data.textOverride;
    if (data.title !== undefined) updates.title = data.title;
    if (data.placeholderValue !== undefined) updates.placeholderValue = data.placeholderValue;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.musicSlotType !== undefined) updates.musicSlotType = data.musicSlotType;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(serviceSections)
      .set(updates)
      .where(and(eq(serviceSections.id, sectionId), eq(serviceSections.serviceId, serviceId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("Failed to update service section", err);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; sectionId: string }> }
) {
  const { churchId, serviceId, sectionId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
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

    const [existing] = await db
      .select({ id: serviceSections.id })
      .from(serviceSections)
      .where(and(eq(serviceSections.id, sectionId), eq(serviceSections.serviceId, serviceId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Delete + recalculate positions atomically
    await db.transaction(async (tx) => {
      // Delete the section
      await tx
        .delete(serviceSections)
        .where(and(eq(serviceSections.id, sectionId), eq(serviceSections.serviceId, serviceId)));

      // Recalculate positionOrder for remaining sections (1-based, sequential)
      const remaining = await tx
        .select({ id: serviceSections.id })
        .from(serviceSections)
        .where(eq(serviceSections.serviceId, serviceId))
        .orderBy(asc(serviceSections.positionOrder));

      // Collapse the per-row renumber into one CASE update instead of N
      // sequential round-trips inside the transaction.
      if (remaining.length > 0) {
        const cases = remaining.map(
          (row, i) => sql`when ${serviceSections.id} = ${row.id} then ${i + 1}`
        );
        await tx
          .update(serviceSections)
          .set({ positionOrder: sql`case ${sql.join(cases, sql` `)} end` })
          .where(
            and(
              eq(serviceSections.serviceId, serviceId),
              inArray(
                serviceSections.id,
                remaining.map((row) => row.id)
              )
            )
          );
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to delete service section", err);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
