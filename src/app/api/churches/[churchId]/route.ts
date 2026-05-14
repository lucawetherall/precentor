import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { churchUpdateSchema } from "@/lib/validation/schemas";
import { parseJsonBody } from "@/lib/api/parse-body";
import { writeSheetMusicLink } from "@/lib/churches/settings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { data: fields, error: bodyError } = await parseJsonBody(request, churchUpdateSchema);
  if (bodyError) return bodyError;

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("name" in fields) updates.name = fields.name;
    if ("diocese" in fields) updates.diocese = fields.diocese || null;
    if ("address" in fields) updates.address = fields.address || null;
    if ("ccliNumber" in fields) updates.ccliNumber = fields.ccliNumber || null;

    // `sheetMusicLink` lives inside the shared `settings` JSON blob. Merge into
    // the existing settings so we don't clobber unrelated keys.
    if ("sheetMusicLink" in fields) {
      const [existing] = await db
        .select({ settings: churches.settings })
        .from(churches)
        .where(eq(churches.id, churchId))
        .limit(1);
      updates.settings = writeSheetMusicLink(existing?.settings ?? {}, fields.sheetMusicLink ?? null);
    }

    const [updated] = await db
      .update(churches)
      .set(updates)
      .where(eq(churches.id, churchId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update church", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
