import { NextResponse } from "next/server";
import { createLLMProvider } from "@/lib/ai/provider";
import { requireChurchRole, requireAuth } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { services, liturgicalDays, readings, performanceLogs } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { format, subWeeks } from "date-fns";
import type { SuggestionContext } from "@/lib/ai/types";
import { rateLimit } from "@/lib/rate-limit";
import { consumeAiQuota } from "@/lib/ai/quota";

export async function POST(request: Request) {
  // Auth check and rate limit before expensive operations
  const { user: authUser, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const rateLimited = await rateLimit(`ai-suggest:${authUser!.id}`, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
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

    // Verify the user is a member of this church (auth check scoped to the resolved churchId)
    const { error: authError } = await requireChurchRole(service.churchId, "MEMBER");
    if (authError) return authError;

    // Enforce per-church daily quota before paying for the Gemini call.
    // Atomic UPSERT inside — no TOCTOU between check and increment.
    const quota = await consumeAiQuota(service.churchId);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Daily AI suggestion quota reached (${quota.limit}). Resets at midnight UTC.`,
          quota,
        },
        { status: 429 },
      );
    }

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
    logger.error("AI suggestion failed", error);
    return NextResponse.json(
      { error: "Suggestion failed" },
      { status: 500 }
    );
  }
}
