import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { musicSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const slots = await db
      .select()
      .from(musicSlots)
      .where(eq(musicSlots.serviceId, serviceId))
      .orderBy(musicSlots.positionOrder);

    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const body = await request.json();
  const { slots } = body;

  try {
    await db.delete(musicSlots).where(eq(musicSlots.serviceId, serviceId));

    if (slots && slots.length > 0) {
      await db.insert(musicSlots).values(
        slots.map((slot: any, i: number) => ({
          serviceId,
          slotType: slot.slotType as any,
          positionOrder: i,
          hymnId: slot.hymnId || null,
          anthemId: slot.anthemId || null,
          massSettingId: slot.massSettingId || null,
          canticleSettingId: slot.canticleSettingId || null,
          responsesSettingId: slot.responsesSettingId || null,
          freeText: slot.freeText || null,
          notes: slot.notes || null,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save music slots:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
