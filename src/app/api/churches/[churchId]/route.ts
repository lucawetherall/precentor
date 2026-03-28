import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("name" in body) updates.name = body.name;
    if ("diocese" in body) updates.diocese = body.diocese || null;
    if ("address" in body) updates.address = body.address || null;
    if ("ccliNumber" in body) updates.ccliNumber = body.ccliNumber || null;

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
