import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const body = await request.json();

  try {
    const [updated] = await db
      .update(churches)
      .set({
        name: body.name,
        diocese: body.diocese || null,
        address: body.address || null,
        ccliNumber: body.ccliNumber || null,
        updatedAt: new Date(),
      })
      .where(eq(churches.id, churchId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update church:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
