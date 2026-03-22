import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_PRAYERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

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

  // Build update object from allowed fields
  const updates: Record<string, unknown> = {};

  if ("sheetMode" in body) {
    if (body.sheetMode !== "booklet" && body.sheetMode !== "summary") {
      return NextResponse.json(
        { error: "sheetMode must be 'booklet' or 'summary'" },
        { status: 400 }
      );
    }
    updates.sheetMode = body.sheetMode;
  }

  if ("eucharisticPrayer" in body) {
    if (body.eucharisticPrayer !== null && !VALID_PRAYERS.includes(body.eucharisticPrayer as string)) {
      return NextResponse.json(
        { error: "eucharisticPrayer must be A-H or null" },
        { status: 400 }
      );
    }
    updates.eucharisticPrayer = body.eucharisticPrayer;
  }

  if ("includeReadingText" in body) {
    if (typeof body.includeReadingText !== "boolean") {
      return NextResponse.json(
        { error: "includeReadingText must be a boolean" },
        { status: 400 }
      );
    }
    updates.includeReadingText = body.includeReadingText;
  }

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
