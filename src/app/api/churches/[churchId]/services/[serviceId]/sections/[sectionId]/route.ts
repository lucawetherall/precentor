import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; sectionId: string }> }
) {
  const { churchId, serviceId, sectionId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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

    // Verify the section belongs to this service
    const [existing] = await db
      .select({ id: serviceSections.id })
      .from(serviceSections)
      .where(and(eq(serviceSections.id, sectionId), eq(serviceSections.serviceId, serviceId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {};

    if ("visible" in body) {
      if (typeof body.visible !== "boolean") {
        return NextResponse.json({ error: "visible must be a boolean" }, { status: 400 });
      }
      updates.visible = body.visible;
    }

    if ("textOverride" in body) {
      if (body.textOverride !== null) {
        if (
          !Array.isArray(body.textOverride) ||
          body.textOverride.length > 200 ||
          !body.textOverride.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as Record<string, unknown>).speaker === "string" &&
              ((item as Record<string, unknown>).speaker as string).length <= 200 &&
              typeof (item as Record<string, unknown>).text === "string" &&
              ((item as Record<string, unknown>).text as string).length <= 10_000
          )
        ) {
          return NextResponse.json(
            { error: "textOverride must be null or an array (max 200) of { speaker: string ≤200, text: string ≤10000 }" },
            { status: 400 }
          );
        }
      }
      updates.textOverride = body.textOverride;
    }

    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title || body.title.length > 500) {
        return NextResponse.json({ error: "title must be a non-empty string of 500 characters or fewer" }, { status: 400 });
      }
      updates.title = body.title;
    }

    if ("placeholderValue" in body) {
      if (body.placeholderValue !== null && (typeof body.placeholderValue !== "string" || body.placeholderValue.length > 10_000)) {
        return NextResponse.json({ error: "placeholderValue must be null or a string of 10000 characters or fewer" }, { status: 400 });
      }
      updates.placeholderValue = body.placeholderValue;
    }

    if ("notes" in body) {
      if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 5000)) {
        return NextResponse.json({ error: "notes must be null or a string of 5000 characters or fewer" }, { status: 400 });
      }
      updates.notes = body.notes;
    }

    if ("musicSlotType" in body) {
      if (body.musicSlotType !== null) {
        if (!musicSlotTypeEnum.enumValues.includes(body.musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number])) {
          return NextResponse.json({ error: "Invalid musicSlotType" }, { status: 400 });
        }
      }
      updates.musicSlotType = body.musicSlotType;
    }

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
    // Verify the service belongs to this church
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Verify the section belongs to this service
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

      for (let i = 0; i < remaining.length; i++) {
        await tx
          .update(serviceSections)
          .set({ positionOrder: i + 1 })
          .where(eq(serviceSections.id, remaining[i].id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to delete service section", err);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
