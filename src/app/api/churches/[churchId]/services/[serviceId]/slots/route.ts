import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { musicSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireMembership, VALID_SLOT_TYPES, isValidEnum } from "@/lib/auth/membership";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authResult = await requireMembership(user.id, churchId, "MEMBER");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const slots = await db
      .select()
      .from(musicSlots)
      .where(eq(musicSlots.serviceId, serviceId))
      .orderBy(musicSlots.positionOrder);

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Failed to fetch music slots:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authResult = await requireMembership(user.id, churchId, "EDITOR");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const { slots } = body;

  // Validate all slot types
  if (slots && Array.isArray(slots)) {
    for (const slot of slots) {
      if (!isValidEnum(slot.slotType, VALID_SLOT_TYPES)) {
        return NextResponse.json({ error: `Invalid slot type: ${slot.slotType}` }, { status: 400 });
      }
    }
  }

  try {
    // Delete existing slots and re-insert
    await db.delete(musicSlots).where(eq(musicSlots.serviceId, serviceId));

    if (slots && slots.length > 0) {
      await db.insert(musicSlots).values(
        slots.map((slot: { slotType: string; hymnId?: string; anthemId?: string; massSettingId?: string; canticleSettingId?: string; responsesSettingId?: string; freeText?: string; notes?: string }, i: number) => ({
          serviceId,
          slotType: slot.slotType as typeof VALID_SLOT_TYPES[number],
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
