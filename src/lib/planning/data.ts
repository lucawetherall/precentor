import "server-only";
import { db } from "@/lib/db";
import {
  services, musicSlots, hymns, anthems, massSettings, canticleSettings,
  responsesSettings, liturgicalDays, readings, churches,
} from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, asc, sql } from "drizzle-orm";
import lectionaryData from "@/data/lectionary-coe.json";
import { readLectionaryTrack, type LectionaryTrack } from "@/lib/churches/settings";
import {
  resolveEffectiveServiceIdentity,
  synthesizeSpecialReadings,
} from "@/lib/services/effective-service-identity";

export interface PlanningDayProjection {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;
  section: string | null;
  /** Lectionary year (A/B/C) — needed to resolve transferred-Festival readings. */
  lectionaryYear: string | null;
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
      lectionaryYear: liturgicalDays.lectionaryYear,
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
      lectionaryYear: d.lectionaryYear,
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
      lectionaryTrack: services.lectionaryTrack,
      specialFeastKey: services.specialFeastKey,
      updatedAt: services.updatedAt,
    })
    .from(services)
    .where(and(eq(services.churchId, churchId), inArray(services.liturgicalDayId, dayIds)));
}

async function loadChurchTrackDefault(churchId: string): Promise<LectionaryTrack> {
  const rows = await db
    .select({ settings: churches.settings })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);
  return readLectionaryTrack(rows[0]?.settings);
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
// Phase D: patterns reference a preset; serviceType/defaultTime come from it.
async function loadPatterns(churchId: string) {
  return db.execute<{
    id: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
    enabled: boolean;
  }>(sql`
    SELECT p.id, p.day_of_week AS "dayOfWeek",
           pr.service_type AS "serviceType", pr.default_time AS "time", p.enabled
    FROM church_service_patterns p
    JOIN church_service_presets pr ON pr.id = p.preset_id
    WHERE p.church_id = ${churchId}
  `);
}

/** A planning service enriched with its effective Festival identity/readings. */
export type PlanningService = Awaited<ReturnType<typeof loadServices>>[number] & {
  /** Festival/alternate display name when a special is active, else null. */
  specialName: string | null;
  /** Effective readings synthesized for the active special, else null. */
  specialReadings: (typeof readings.$inferSelect)[] | null;
};

export interface PlanningDataResponse {
  days: PlanningDayProjection[];
  services: PlanningService[];
  slots: Awaited<ReturnType<typeof loadSlots>>;
  readings: Awaited<ReturnType<typeof loadReadings>>;
  patterns: Awaited<ReturnType<typeof loadPatterns>>;
  /** Church default Ordinary Time psalm track, applied when a service has no override. */
  lectionaryTrackDefault: LectionaryTrack;
}

export async function getPlanningData(
  churchId: string,
  from: string,
  to: string,
): Promise<PlanningDataResponse> {
  // Three dependency waves instead of six serial round-trips:
  // patterns + track default don't depend on the days, and readings depend only
  // on the day ids (not on services), so they parallelise.
  const [days, patterns, lectionaryTrackDefault] = await Promise.all([
    loadDays(from, to),
    loadPatterns(churchId),
    loadChurchTrackDefault(churchId),
  ]);
  const dayIds = days.map((d) => d.id);
  const [serviceRows, readingRows] = await Promise.all([
    loadServices(churchId, dayIds),
    loadReadings(dayIds),
  ]);
  const serviceIds = serviceRows.map((s) => s.id);
  const slotRows = await loadSlots(serviceIds);

  // Resolve each service's effective Festival identity/readings server-side so
  // the lectionary JSON never reaches the client. Non-special services pass
  // through unchanged.
  const dayById = new Map(days.map((d) => [d.id, d]));
  const enrichedServices: PlanningService[] = serviceRows.map((s) => {
    if (!s.specialFeastKey) return { ...s, specialName: null, specialReadings: null };
    const day = dayById.get(s.liturgicalDayId);
    const identity = resolveEffectiveServiceIdentity({
      day: {
        cwName: day?.cwName ?? "",
        colour: day?.colour ?? "",
        season: day?.season ?? "",
        collect: null,
        postCommunion: null,
      },
      specialFeastKey: s.specialFeastKey,
    });
    const synth = synthesizeSpecialReadings({
      specialFeastKey: s.specialFeastKey,
      lectionaryYear: day?.lectionaryYear ?? null,
      liturgicalDayId: s.liturgicalDayId,
    });
    return {
      ...s,
      specialName: identity.isSpecial ? identity.title : null,
      specialReadings: synth,
    };
  });

  return { days, services: enrichedServices, slots: slotRows, readings: readingRows, patterns, lectionaryTrackDefault };
}
