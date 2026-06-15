import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { musicSlots, services } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// NOTE: this route is intentionally read-only. A previous PUT handler
// replaced all slots wholesale (delete + reinsert with fresh UUIDs), which
// broke serviceSections.musicSlotId links and cascade-deleted
// performanceLogs. Slot mutations go through the per-slot PATCH route
// ([slotId]/route.ts) and the planning cell writers, which update in place.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const slots = await db
      .select()
      .from(musicSlots)
      .where(eq(musicSlots.serviceId, serviceId))
      .orderBy(musicSlots.positionOrder);

    return NextResponse.json(slots);
  } catch (error) {
    logger.error("Failed to fetch music slots", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
