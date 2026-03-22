import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services, musicSlots, performanceLogs, liturgicalDays } from "@/lib/db/schema";
import { eq, and, lt, or, isNotNull, sql } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  try {
    // Single query: join services → liturgical_days → music_slots,
    // left join performance_logs to find slots not yet logged
    const unloggedSlots = await db
      .select({
        slotId: musicSlots.id,
        churchId: services.churchId,
        date: liturgicalDays.date,
        hymnId: musicSlots.hymnId,
        anthemId: musicSlots.anthemId,
        freeText: musicSlots.freeText,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .innerJoin(musicSlots, eq(musicSlots.serviceId, services.id))
      .leftJoin(performanceLogs, eq(performanceLogs.musicSlotId, musicSlots.id))
      .where(
        and(
          eq(services.status, "ARCHIVED"),
          lt(liturgicalDays.date, today),
          sql`${performanceLogs.id} IS NULL`,
          or(
            isNotNull(musicSlots.freeText),
            isNotNull(musicSlots.hymnId),
            isNotNull(musicSlots.anthemId),
          ),
        ),
      );

    if (unloggedSlots.length > 0) {
      await db.insert(performanceLogs).values(
        unloggedSlots.map((slot) => ({
          churchId: slot.churchId,
          musicSlotId: slot.slotId,
          date: slot.date,
          hymnId: slot.hymnId,
          anthemId: slot.anthemId,
          freeText: slot.freeText,
        })),
      );
    }

    return NextResponse.json({ success: true, logged: unloggedSlots.length });
  } catch (error) {
    logger.error("Performance logging failed", error);
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}
