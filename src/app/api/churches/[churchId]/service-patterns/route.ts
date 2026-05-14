import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churchServicePatterns, churchServicePresets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const servicePatternCreateSchema = z.object({
  presetId: z.string().uuid({ message: "presetId is required" }),
  dayOfWeek: z.number().int().min(0, "dayOfWeek must be an integer 0–6").max(6, "dayOfWeek must be an integer 0–6"),
  enabled: z.boolean().default(true),
});

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

  const { data, error: bodyError } = await parseJsonBody(request, servicePatternCreateSchema);
  if (bodyError) return bodyError;
  const { dayOfWeek, enabled, presetId } = data;

  try {
    // Verify the preset belongs to this church before creating a pattern that
    // references it — otherwise an ADMIN of church A could create a pattern in
    // their own church that references church B's preset.
    const [owned] = await db
      .select({ id: churchServicePresets.id })
      .from(churchServicePresets)
      .where(and(
        eq(churchServicePresets.id, presetId),
        eq(churchServicePresets.churchId, churchId),
      ))
      .limit(1);
    if (!owned) {
      return NextResponse.json({ error: "Preset not found in this church" }, { status: 400 });
    }

    const [pattern] = await db
      .insert(churchServicePatterns)
      .values({
        churchId,
        dayOfWeek,
        enabled,
        presetId,
      })
      .returning();

    return NextResponse.json(pattern, { status: 201 });
  } catch (err) {
    logger.error("Failed to create service pattern", err);
    return NextResponse.json({ error: "Failed to create service pattern" }, { status: 500 });
  }
}
