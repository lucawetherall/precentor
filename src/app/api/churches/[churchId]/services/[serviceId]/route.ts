import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services, collects, liturgicalDays } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { serviceUpdateSchema } from "@/lib/validation/schemas";
import { parseJsonBody } from "@/lib/api/parse-body";
import { availableSpecialsForSunday } from "@/lib/lectionary/transferable-festivals";

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
        specialFeastKey: services.specialFeastKey,
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

  const { data, error: bodyError } = await parseJsonBody(request, serviceUpdateSchema);
  if (bodyError) return bodyError;

  const updates: Record<string, unknown> = {};

  if ("sheetMode" in data) updates.sheetMode = data.sheetMode;
  if ("eucharisticPrayer" in data) updates.eucharisticPrayer = data.eucharisticPrayer;
  if ("includeReadingText" in data) updates.includeReadingText = data.includeReadingText;
  if ("eucharisticPrayerId" in data) updates.eucharisticPrayerId = data.eucharisticPrayerId;
  if ("collectId" in data) updates.collectId = data.collectId;
  if ("collectOverride" in data) updates.collectOverride = data.collectOverride;
  if ("defaultMassSettingId" in data) updates.defaultMassSettingId = data.defaultMassSettingId;
  if ("serviceType" in data) updates.serviceType = data.serviceType;
  if ("time" in data) updates.time = data.time;
  if ("status" in data) updates.status = data.status;
  if ("notes" in data) updates.notes = data.notes;
  if ("liturgicalOverrides" in data) updates.liturgicalOverrides = data.liturgicalOverrides;
  if ("lectionaryTrack" in data) updates.lectionaryTrack = data.lectionaryTrack;
  if ("specialFeastKey" in data) updates.specialFeastKey = data.specialFeastKey;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    // Collects are church-scoped (NULL churchId = global). Reject ids that
    // exist but belong to another church — otherwise any valid UUID would be
    // accepted and leak across tenants. eucharisticPrayers and massSettings
    // have no churchId column (global tables), so they need no such check.
    if (typeof data.collectId === "string") {
      const [collect] = await db
        .select({ id: collects.id })
        .from(collects)
        .where(
          and(
            eq(collects.id, data.collectId),
            or(isNull(collects.churchId), eq(collects.churchId, churchId)),
          ),
        )
        .limit(1);
      if (!collect) {
        return NextResponse.json({ error: "Invalid collectId" }, { status: 400 });
      }
    }

    // A non-null special must be an actual transferred Festival / alternate
    // provision available for THIS service's date — otherwise an EDITOR could
    // set any string and swap in arbitrary readings. The service is already
    // scoped by churchId, so the join is multi-tenant safe.
    if (typeof data.specialFeastKey === "string") {
      const [day] = await db
        .select({
          date: liturgicalDays.date,
          sundayKey: liturgicalDays.icalUid,
          season: liturgicalDays.season,
        })
        .from(services)
        .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
        .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
        .limit(1);
      if (!day) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      const available = availableSpecialsForSunday(day.date, day.sundayKey, day.season);
      if (!available.some((s) => s.key === data.specialFeastKey)) {
        return NextResponse.json(
          { error: "Festival not available for this date" },
          { status: 400 },
        );
      }
    }

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
