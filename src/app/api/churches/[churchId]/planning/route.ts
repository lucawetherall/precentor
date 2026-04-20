import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChurchRole } from "@/lib/auth/permissions";
import {
  services, musicSlots, hymns, anthems, massSettings, canticleSettings,
  responsesSettings, liturgicalDays, readings,
} from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, asc, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  // 1. Liturgical days in range
  const days = await db
    .select()
    .from(liturgicalDays)
    .where(and(gte(liturgicalDays.date, from), lte(liturgicalDays.date, to)))
    .orderBy(asc(liturgicalDays.date));

  const dayIds = days.map((d) => d.id);

  // 2. Services for this church in that window
  const serviceRows = dayIds.length === 0 ? [] : await db
    .select()
    .from(services)
    .where(and(eq(services.churchId, churchId), inArray(services.liturgicalDayId, dayIds)));

  // 3. Music slots with joined display text
  const serviceIds = serviceRows.map((s) => s.id);
  const slotRows = serviceIds.length === 0 ? [] : await db
    .select({
      id: musicSlots.id,
      serviceId: musicSlots.serviceId,
      slotType: musicSlots.slotType,
      positionOrder: musicSlots.positionOrder,
      hymnId: musicSlots.hymnId,
      anthemId: musicSlots.anthemId,
      massSettingId: musicSlots.massSettingId,
      canticleSettingId: musicSlots.canticleSettingId,
      responsesSettingId: musicSlots.responsesSettingId,
      freeText: musicSlots.freeText,
      psalmChant: musicSlots.psalmChant,
      hymnBook: hymns.book,
      hymnNumber: hymns.number,
      hymnFirstLine: hymns.firstLine,
      anthemTitle: anthems.title,
      anthemComposer: anthems.composer,
      massSettingName: massSettings.name,
      massSettingComposer: massSettings.composer,
      canticleSettingName: canticleSettings.name,
      canticleSettingComposer: canticleSettings.composer,
      responsesSettingName: responsesSettings.name,
      responsesSettingComposer: responsesSettings.composer,
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .leftJoin(massSettings, eq(musicSlots.massSettingId, massSettings.id))
    .leftJoin(canticleSettings, eq(musicSlots.canticleSettingId, canticleSettings.id))
    .leftJoin(responsesSettings, eq(musicSlots.responsesSettingId, responsesSettings.id))
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));

  // 4. Readings for each day
  const readingRows = dayIds.length === 0 ? [] : await db
    .select()
    .from(readings)
    .where(inArray(readings.liturgicalDayId, dayIds));

  // 5. Patterns (for client-side ghost computation)
  // The DB table still has the old schema (service_type, time columns) rather
  // than the newer preset_id reference. Select explicitly to avoid Drizzle
  // generating a query for columns that don't exist in the DB yet.
  const patternRows = await db.execute(sql`
    SELECT id, day_of_week AS "dayOfWeek", service_type AS "serviceType", time, enabled
    FROM church_service_patterns
    WHERE church_id = ${churchId}
  `);
  const patterns = patternRows.rows as Array<{
    id: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
    enabled: boolean;
  }>;

  return NextResponse.json({
    days,
    services: serviceRows,
    slots: slotRows,
    readings: readingRows,
    patterns,
  });
}
