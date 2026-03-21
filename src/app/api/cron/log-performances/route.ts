import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, musicSlots, performanceLogs, liturgicalDays } from "@/lib/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  let logged = 0;

  try {
    // Fetch all archived services before today
    const archivedServices = await db
      .select({
        serviceId: services.id,
        churchId: services.churchId,
        date: liturgicalDays.date,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .where(and(eq(services.status, "ARCHIVED"), lt(liturgicalDays.date, today)));

    if (archivedServices.length === 0) {
      return NextResponse.json({ success: true, logged: 0 });
    }

    const serviceIds = archivedServices.map((s) => s.serviceId);

    // Batch-fetch all music slots for these services
    const allSlots = await db
      .select()
      .from(musicSlots)
      .where(inArray(musicSlots.serviceId, serviceIds));

    if (allSlots.length === 0) {
      return NextResponse.json({ success: true, logged: 0 });
    }

    const slotIds = allSlots.map((s) => s.id);

    // Batch-check existing performance logs
    const existingLogs = await db
      .select({ musicSlotId: performanceLogs.musicSlotId })
      .from(performanceLogs)
      .where(inArray(performanceLogs.musicSlotId, slotIds));

    const existingSlotIds = new Set(existingLogs.map((l) => l.musicSlotId));

    // Build a map of serviceId -> service info
    const serviceMap = new Map(archivedServices.map((s) => [s.serviceId, s]));

    // Collect new logs to insert
    const newLogs = allSlots
      .filter((slot) => !existingSlotIds.has(slot.id) && (slot.freeText || slot.hymnId || slot.anthemId))
      .map((slot) => {
        const service = serviceMap.get(slot.serviceId)!;
        return {
          churchId: service.churchId,
          musicSlotId: slot.id,
          date: service.date,
          hymnId: slot.hymnId,
          anthemId: slot.anthemId,
          freeText: slot.freeText,
        };
      });

    // Batch-insert
    if (newLogs.length > 0) {
      await db.insert(performanceLogs).values(newLogs);
      logged = newLogs.length;
    }

    return NextResponse.json({ success: true, logged });
  } catch (error) {
    console.error("Performance logging failed:", error);
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}
