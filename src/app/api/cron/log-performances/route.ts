import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, musicSlots, performanceLogs, liturgicalDays } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  let logged = 0;

  try {
    const archivedServices = await db
      .select({
        serviceId: services.id,
        churchId: services.churchId,
        date: liturgicalDays.date,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .where(and(eq(services.status, "ARCHIVED"), lt(liturgicalDays.date, today)));

    for (const service of archivedServices) {
      const slots = await db
        .select()
        .from(musicSlots)
        .where(eq(musicSlots.serviceId, service.serviceId));

      for (const slot of slots) {
        const existing = await db
          .select()
          .from(performanceLogs)
          .where(eq(performanceLogs.musicSlotId, slot.id))
          .limit(1);

        if (existing.length === 0 && (slot.freeText || slot.hymnId || slot.anthemId)) {
          await db.insert(performanceLogs).values({
            churchId: service.churchId,
            musicSlotId: slot.id,
            date: service.date,
            hymnId: slot.hymnId,
            anthemId: slot.anthemId,
            freeText: slot.freeText,
          });
          logged++;
        }
      }
    }

    return NextResponse.json({ success: true, logged });
  } catch (error) {
    console.error("Performance logging failed:", error);
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}
