import "server-only";
import { db } from "@/lib/db";
import {
  services, musicSlots, hymns, anthems, massSettings, canticleSettings,
  responsesSettings, liturgicalDays, readings,
} from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, asc, sql } from "drizzle-orm";
import lectionaryData from "@/data/lectionary-coe.json";

export interface PlanningDayProjection {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;
  section: string | null;
}

async function loadDays(from: string, to: string): Promise<PlanningDayProjection[]> {
  const dayRows = await db
    .select({
      id: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      season: liturgicalDays.season,
      colour: liturgicalDays.colour,
      icalUid: liturgicalDays.icalUid,
    })
    .from(liturgicalDays)
    .where(and(gte(liturgicalDays.date, from), lte(liturgicalDays.date, to)))
    .orderBy(asc(liturgicalDays.date));

  const sundays = (lectionaryData as { sundays: Record<string, { section: string }> }).sundays;
  return dayRows.map((d) => {
    const sundayKey = d.icalUid ?? null;
    const section = sundayKey && sundays[sundayKey] ? sundays[sundayKey].section : null;
    return {
      id: d.id,
      date: d.date,
      cwName: d.cwName,
      season: d.season,
      colour: d.colour,
      sundayKey,
      section,
    };
  });
}

async function loadServices(churchId: string, dayIds: string[]) {
  if (dayIds.length === 0) return [];
  return db
    .select({
      id: services.id,
      churchId: services.churchId,
      liturgicalDayId: services.liturgicalDayId,
      serviceType: services.serviceType,
      time: services.time,
      status: services.status,
      notes: services.notes,
    })
    .from(services)
    .where(and(eq(services.churchId, churchId), inArray(services.liturgicalDayId, dayIds)));
}

async function loadSlots(serviceIds: string[]) {
  if (serviceIds.length === 0) return [];
  return db
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
}

async function loadReadings(dayIds: string[]) {
  if (dayIds.length === 0) return [];
  return db
    .select()
    .from(readings)
    .where(inArray(readings.liturgicalDayId, dayIds));
}

// db.execute<T>(sql) returns T[] directly (see commit 398d419).
async function loadPatterns(churchId: string) {
  return db.execute<{
    id: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
    enabled: boolean;
  }>(sql`
    SELECT id, day_of_week AS "dayOfWeek", service_type AS "serviceType", time, enabled
    FROM church_service_patterns
    WHERE church_id = ${churchId}
  `);
}

export interface PlanningDataResponse {
  days: PlanningDayProjection[];
  services: Awaited<ReturnType<typeof loadServices>>;
  slots: Awaited<ReturnType<typeof loadSlots>>;
  readings: Awaited<ReturnType<typeof loadReadings>>;
  patterns: Awaited<ReturnType<typeof loadPatterns>>;
}

export async function getPlanningData(
  churchId: string,
  from: string,
  to: string,
): Promise<PlanningDataResponse> {
  const days = await loadDays(from, to);
  const dayIds = days.map((d) => d.id);
  const serviceRows = await loadServices(churchId, dayIds);
  const serviceIds = serviceRows.map((s) => s.id);
  const slotRows = await loadSlots(serviceIds);
  const readingRows = await loadReadings(dayIds);
  const patterns = await loadPatterns(churchId);
  return { days, services: serviceRows, slots: slotRows, readings: readingRows, patterns };
}
