import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { serviceUpdateSchema } from "@/lib/validation/schemas";
import { apiError } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const result = await db
      .select({
        id: services.id,
        sheetMode: services.sheetMode,
        eucharisticPrayer: services.eucharisticPrayer,
        includeReadingText: services.includeReadingText,
        liturgicalOverrides: services.liturgicalOverrides,
      })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    logger.error("Failed to fetch service settings", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = serviceUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

  // Build update object from allowed fields
  const updates: Record<string, unknown> = {};
  const data = parsed.data;

  if ("sheetMode" in data) updates.sheetMode = data.sheetMode;
  if ("eucharisticPrayer" in data) updates.eucharisticPrayer = data.eucharisticPrayer;
  if ("includeReadingText" in data) updates.includeReadingText = data.includeReadingText;
  if ("eucharisticPrayerId" in data) updates.eucharisticPrayerId = data.eucharisticPrayerId;
  if ("collectId" in data) updates.collectId = data.collectId;
  if ("collectOverride" in data) updates.collectOverride = data.collectOverride;
  if ("defaultMassSettingId" in data) updates.defaultMassSettingId = data.defaultMassSettingId;
  if ("choirStatus" in data) updates.choirStatus = data.choirStatus;
  if ("serviceType" in data) updates.serviceType = data.serviceType;
  if ("time" in data) updates.time = data.time;
  if ("status" in data) updates.status = data.status;
  if ("notes" in data) updates.notes = data.notes;
  if ("liturgicalOverrides" in data) updates.liturgicalOverrides = data.liturgicalOverrides;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const result = await db
      .update(services)
      .set(updates)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .returning({ id: services.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to update service settings", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  try {
    const result = await db
      .delete(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .returning({ id: services.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to delete service", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
