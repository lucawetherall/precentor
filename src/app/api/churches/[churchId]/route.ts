import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { churchUpdateSchema } from "@/lib/validation/schemas";
import { writeSheetMusicLink } from "@/lib/churches/settings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = churchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    // Return per-field errors so clients can highlight individual inputs.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".") || "_root";
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return NextResponse.json(
      { error: parsed.error.issues[0].message, fieldErrors },
      { status: 400 }
    );
  }
  const fields = parsed.data;

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
