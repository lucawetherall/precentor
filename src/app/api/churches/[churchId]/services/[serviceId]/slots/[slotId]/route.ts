import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { musicSlots, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> }
) {
  const { churchId, serviceId, slotId } = await params;
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

    // Verify the slot belongs to this service
    const [existing] = await db
      .select({ id: musicSlots.id })
      .from(musicSlots)
      .where(and(eq(musicSlots.id, slotId), eq(musicSlots.serviceId, serviceId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {};

    if ("verseCount" in body) {
      if (body.verseCount !== null) {
        if (typeof body.verseCount !== "number" || !Number.isInteger(body.verseCount) || body.verseCount < 1) {
          return NextResponse.json({ error: "verseCount must be a positive integer or null" }, { status: 400 });
        }
      }
      updates.verseCount = body.verseCount;
    }

    if ("selectedVerses" in body) {
      if (body.selectedVerses !== null && !Array.isArray(body.selectedVerses)) {
        return NextResponse.json({ error: "selectedVerses must be an array or null" }, { status: 400 });
      }
      updates.selectedVerses = body.selectedVerses;
    }

    if ("hymnId" in body) {
      if (body.hymnId !== null && typeof body.hymnId !== "string") {
        return NextResponse.json({ error: "hymnId must be a string or null" }, { status: 400 });
      }
      updates.hymnId = body.hymnId;
    }

    if ("anthemId" in body) {
      if (body.anthemId !== null && typeof body.anthemId !== "string") {
        return NextResponse.json({ error: "anthemId must be a string or null" }, { status: 400 });
      }
      updates.anthemId = body.anthemId;
    }

    if ("massSettingId" in body) {
      if (body.massSettingId !== null && typeof body.massSettingId !== "string") {
        return NextResponse.json({ error: "massSettingId must be a string or null" }, { status: 400 });
      }
      updates.massSettingId = body.massSettingId;
    }

    if ("freeText" in body) {
      if (body.freeText !== null && typeof body.freeText !== "string") {
        return NextResponse.json({ error: "freeText must be a string or null" }, { status: 400 });
      }
      if (typeof body.freeText === "string" && body.freeText.length > 1000) {
        return NextResponse.json({ error: "freeText must be at most 1000 characters" }, { status: 400 });
      }
      updates.freeText = body.freeText;
    }

    if ("notes" in body) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return NextResponse.json({ error: "notes must be a string or null" }, { status: 400 });
      }
      if (typeof body.notes === "string" && body.notes.length > 5000) {
        return NextResponse.json({ error: "notes must be at most 5000 characters" }, { status: 400 });
      }
      updates.notes = body.notes;
    }

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
