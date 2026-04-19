import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churchServicePatterns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const patterns = await db
      .select()
      .from(churchServicePatterns)
      .where(eq(churchServicePatterns.churchId, churchId));
    return NextResponse.json(patterns);
  } catch (err) {
    logger.error("Failed to load service patterns", err);
    return NextResponse.json({ error: "Failed to load service patterns" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: { dayOfWeek?: unknown; enabled?: unknown; presetId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dayOfWeek, enabled, presetId } = body;

  if (!presetId || typeof presetId !== "string") {
    return NextResponse.json({ error: "presetId is required" }, { status: 400 });
  }

  if (
    typeof dayOfWeek !== "number" ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return NextResponse.json(
      { error: "dayOfWeek must be an integer 0–6" },
      { status: 400 },
    );
  }

  try {
    const [pattern] = await db
      .insert(churchServicePatterns)
      .values({
        churchId,
        dayOfWeek,
        enabled: typeof enabled === "boolean" ? enabled : true,
        presetId: presetId as string,
      })
      .returning();

    return NextResponse.json(pattern, { status: 201 });
  } catch (err) {
    logger.error("Failed to create service pattern", err);
    return NextResponse.json({ error: "Failed to create service pattern" }, { status: 500 });
  }
}
