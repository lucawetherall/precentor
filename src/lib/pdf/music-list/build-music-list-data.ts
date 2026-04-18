// Builds typed MusicListData from the database for a given church + date range.

import { db } from "@/lib/db";
import {
  services,
  liturgicalDays,
  musicSlots,
  hymns,
  anthems,
  massSettings,
  canticleSettings,
  responsesSettings,
  churches,
} from "@/lib/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import type { MusicListData, MusicListMonth, MusicListService } from "@/types/music-list";
import type { ServiceType, HymnBook } from "@/types";
import {
  musicSlotRowsForService,
  type MusicSlotRow,
} from "./label-mapping";
import { serviceTypeLabelFor, type ChoirStatus } from "./service-type-label";
import { formatPeriodSubtitle } from "./period-subtitle";

/**
 * Build the typed `MusicListData` payload for a church + date range.
 *
 * Returns `null` if the church does not exist.
 * Returns `MusicListData` with `months: []` if the church exists but has
 * no services in range.
 *
 * Two DB round-trips:
 *   1. services ⨝ liturgicalDays in range, ordered (date asc, time asc)
 *   2. musicSlots with 5 left-joins for all the serviceIds above,
 *      ordered by positionOrder asc
 */
export async function buildMusicListData(
  churchId: string,
  fromDate: string,
  toDate: string,
  churchNameOverride?: string,
): Promise<MusicListData | null> {
  // Look up church name (unless overridden)
  const churchRows = await db
    .select({ id: churches.id, name: churches.name })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);

  const church = churchRows[0];
  if (!church) return null;

  const churchName = (churchNameOverride?.trim() || church.name).trim();
  const periodSubtitle = formatPeriodSubtitle(fromDate, toDate);

  // ── Query 1: services in range ──────────────────────────────────
  const serviceRows = await db
    .select({
      serviceId: services.id,
      serviceType: services.serviceType,
      time: services.time,
      choirStatus: services.choirStatus,
      notes: services.notes,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      season: liturgicalDays.season,
    })
    .from(services)
    .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
    .where(
      and(
        eq(services.churchId, churchId),
        gte(liturgicalDays.date, fromDate),
        lte(liturgicalDays.date, toDate),
      ),
    )
    .orderBy(asc(liturgicalDays.date), asc(services.time));

  // Drop services where the choir status explicitly says "no service".
  // Silent filter — this is expected/normal behaviour, not worth logging
  // per-occurrence (would flood logs on churches with many NO_SERVICE days).
  const visible = serviceRows.filter((r) => r.choirStatus !== "NO_SERVICE");

  if (visible.length === 0) {
    return {
      churchName,
      periodSubtitle,
      months: [],
    };
  }

  // ── Query 2: music slots for those services ─────────────────────
  const serviceIds = visible.map((v) => v.serviceId);

  const slotRows = await db
    .select({
      slot: musicSlots,
      hymn: {
        book: hymns.book,
        number: hymns.number,
        firstLine: hymns.firstLine,
        composer: hymns.composer,
      },
      anthem: {
        title: anthems.title,
        composer: anthems.composer,
        arranger: anthems.arranger,
      },
      mass: {
        name: massSettings.name,
        composer: massSettings.composer,
      },
      canticle: {
        name: canticleSettings.name,
        composer: canticleSettings.composer,
        key: canticleSettings.key,
        canticle: canticleSettings.canticle,
      },
      responses: {
        name: responsesSettings.name,
        composer: responsesSettings.composer,
      },
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .leftJoin(massSettings, eq(musicSlots.massSettingId, massSettings.id))
    .leftJoin(canticleSettings, eq(musicSlots.canticleSettingId, canticleSettings.id))
    .leftJoin(responsesSettings, eq(musicSlots.responsesSettingId, responsesSettings.id))
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));

  // Group slots by serviceId
  const slotsByService = new Map<string, MusicSlotRow[]>();
  for (const row of slotRows) {
    const s = row.slot;
    const mapped: MusicSlotRow = {
      id: s.id,
      slotType: s.slotType,
      positionOrder: s.positionOrder,
      freeText: s.freeText,
      notes: s.notes,
      hymnId: s.hymnId,
      anthemId: s.anthemId,
      massSettingId: s.massSettingId,
      canticleSettingId: s.canticleSettingId,
      responsesSettingId: s.responsesSettingId,
      hymn:
        row.hymn && s.hymnId && row.hymn.book !== null
          ? {
              book: row.hymn.book as HymnBook,
              number: row.hymn.number,
              firstLine: row.hymn.firstLine,
              composer: row.hymn.composer,
            }
          : null,
      anthem:
        row.anthem && s.anthemId && row.anthem.title !== null
          ? {
              title: row.anthem.title,
              composer: row.anthem.composer,
              arranger: row.anthem.arranger,
            }
          : null,
      mass:
        row.mass && s.massSettingId && row.mass.name !== null
          ? { name: row.mass.name, composer: row.mass.composer }
          : null,
      canticle:
        row.canticle && s.canticleSettingId && row.canticle.composer !== null
          ? {
              name: row.canticle.name,
              composer: row.canticle.composer,
              key: row.canticle.key,
              canticle: row.canticle.canticle,
            }
          : null,
      responses:
        row.responses && s.responsesSettingId && row.responses.composer !== null
          ? { name: row.responses.name, composer: row.responses.composer }
          : null,
    };
    const bucket = slotsByService.get(s.serviceId);
    if (bucket) bucket.push(mapped);
    else slotsByService.set(s.serviceId, [mapped]);
  }

  // Build MusicListService entries in pre-sorted order, then group by month.
  const months: MusicListMonth[] = [];
  let currentKey = "";
  let currentMonth: MusicListMonth | null = null;

  for (const row of visible) {
    const slots = slotsByService.get(row.serviceId) ?? [];
    const choirStatus = row.choirStatus as ChoirStatus;
    const isSaid = choirStatus === "SAID_SERVICE_ONLY";
    const serviceTypeLabel = serviceTypeLabelFor(
      row.serviceType as ServiceType,
      choirStatus,
    );

    const svc: MusicListService = {
      id: row.serviceId,
      date: row.date,
      time: row.time,
      feastName: row.cwName,
      serviceTypeLabel,
      isSaid,
      ...(isSaid ? { saidNote: "Choir not needed." } : {}),
      items: isSaid ? [] : musicSlotRowsForService(slots),
      colour: row.colour,
      season: row.season,
    };

    const dt = parseISO(row.date);
    const year = dt.getFullYear();
    const monthName = format(dt, "LLLL");
    const key = `${year}-${dt.getMonth()}`;
    if (key !== currentKey || currentMonth === null) {
      currentMonth = { monthName, year, services: [] };
      months.push(currentMonth);
      currentKey = key;
    }
    currentMonth.services.push(svc);
  }

  return {
    churchName,
    periodSubtitle,
    months,
  };
}
