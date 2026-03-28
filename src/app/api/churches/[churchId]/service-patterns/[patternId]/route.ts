import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churchServicePatterns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; patternId: string }> },
) {
  const { churchId, patternId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: { enabled?: unknown; time?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { enabled?: boolean; time?: string | null } = {};
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.time !== undefined) {
    updates.time = typeof body.time === "string" ? body.time : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(churchServicePatterns)
      .set(updates)
      .where(
        and(
          eq(churchServicePatterns.id, patternId),
          eq(churchServicePatterns.churchId, churchId),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    logger.error("Failed to update service pattern", err);
    return NextResponse.json({ error: "Failed to update service pattern" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; patternId: string }> },
) {
  const { churchId, patternId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const [deleted] = await db
      .delete(churchServicePatterns)
      .where(
        and(
          eq(churchServicePatterns.id, patternId),
          eq(churchServicePatterns.churchId, churchId),
        ),
      )
      .returning({ id: churchServicePatterns.id });

    if (!deleted) {
      return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error("Failed to delete service pattern", err);
    return NextResponse.json({ error: "Failed to delete service pattern" }, { status: 500 });
  }
}
