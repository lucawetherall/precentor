import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLLMProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { services, liturgicalDays, readings, musicSlots, hymns, anthems, performanceLogs } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { format, subWeeks } from "date-fns";
import type { SuggestionContext } from "@/lib/ai/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { serviceId, slotType } = body;

  if (!serviceId || !slotType) {
    return NextResponse.json({ error: "serviceId and slotType required" }, { status: 400 });
  }

  try {
    // Get service with liturgical day
    const serviceResult = await db
      .select({
        service: services,
        day: liturgicalDays,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .where(eq(services.id, serviceId))
      .limit(1);

    if (serviceResult.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const { service, day } = serviceResult[0];

    // Get readings for the day
    const dayReadings = await db
      .select()
      .from(readings)
      .where(eq(readings.liturgicalDayId, day.id));

    // Get recent performances (last 6 weeks)
    const sixWeeksAgo = format(subWeeks(new Date(), 6), "yyyy-MM-dd");
    const recentPerfs = await db
      .select({
        date: performanceLogs.date,
        freeText: performanceLogs.freeText,
      })
      .from(performanceLogs)
      .where(
        and(
          eq(performanceLogs.churchId, service.churchId),
          gte(performanceLogs.date, sixWeeksAgo)
        )
      )
      .orderBy(desc(performanceLogs.date))
      .limit(50);

    const context: SuggestionContext = {
      churchId: service.churchId,
      serviceId: service.id,
      slotType,
      date: day.date,
      liturgicalName: day.cwName,
      season: day.season,
      colour: day.colour,
      readings: dayReadings.map((r) => ({
        position: r.position,
        reference: r.reference,
      })),
      collect: day.collect || undefined,
      recentPerformances: recentPerfs.map((p) => ({
        title: p.freeText || "Unknown",
        date: p.date,
      })),
      availableBooks: ["NEH", "AM"],
    };

    const provider = createLLMProvider();
    const suggestions = await provider.suggestMusic(context);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("AI suggestion failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Suggestion failed" },
      { status: 500 }
    );
  }
}
