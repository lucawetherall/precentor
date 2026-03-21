import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const body = await request.json();
  const { userId, serviceId, status } = body;

  try {
    await db
      .insert(availability)
      .values({
        userId,
        serviceId,
        status: status as any,
      })
      .onConflictDoUpdate({
        target: [availability.userId, availability.serviceId],
        set: { status: status as any },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
