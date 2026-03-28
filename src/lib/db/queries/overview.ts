import { db } from "@/lib/db";
import {
  liturgicalDays, services, musicSlots, availability,
  rotaEntries, churchMemberships, hymns, anthems,
} from "@/lib/db/schema";
import { eq, and, gte, asc, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";

/** Get the next upcoming liturgical day with its services for a church */
export async function getThisSunday(churchId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      season: liturgicalDays.season,
      serviceId: services.id,
      serviceType: services.serviceType,
      time: services.time,
    })
    .from(liturgicalDays)
    .leftJoin(
      services,
      and(
        eq(services.liturgicalDayId, liturgicalDays.id),
        eq(services.churchId, churchId)
      )
    )
    .where(gte(liturgicalDays.date, today))
    .orderBy(asc(liturgicalDays.date), asc(services.time))
    .limit(10);

  if (rows.length === 0) return null;

  const firstDay = rows[0];
  const dayServices = rows
    .filter((r) => r.dayId === firstDay.dayId && r.serviceId)
    .map((r) => ({
      serviceId: r.serviceId!,
      serviceType: r.serviceType!,
      time: r.time,
    }));

  return {
    id: firstDay.dayId,
    date: firstDay.date,
    cwName: firstDay.cwName,
    colour: firstDay.colour,
    season: firstDay.season,
    services: dayServices,
  };
}

/** Get rota summary for a list of services — count by voice part */
export async function getRotaSummary(serviceIds: string[], churchId: string) {
  if (serviceIds.length === 0) return new Map<string, { total: number; byPart: Record<string, number> }>();

  const entries = await db
    .select({
      serviceId: rotaEntries.serviceId,
      voicePart: churchMemberships.voicePart,
    })
    .from(rotaEntries)
    .innerJoin(churchMemberships, and(
      eq(rotaEntries.userId, churchMemberships.userId),
      eq(churchMemberships.churchId, churchId)
    ))
    .where(inArray(rotaEntries.serviceId, serviceIds));

  const result = new Map<string, { total: number; byPart: Record<string, number> }>();
  for (const sid of serviceIds) {
    result.set(sid, { total: 0, byPart: {} });
  }

  for (const entry of entries) {
    const summary = result.get(entry.serviceId)!;
    summary.total++;
    const part = entry.voicePart || "Unassigned";
    summary.byPart[part] = (summary.byPart[part] || 0) + 1;
  }

  return result;
}

/** Get upcoming days needing attention — no services or no music content assigned.
 *
 * IMPORTANT: Services created from templates already have musicSlot rows
 * (one per template section). A non-zero slot count does NOT mean music has been
 * assigned. We must check whether any slot has actual content (hymnId, anthemId,
 * freeText, massSettingId, canticleSettingId, or responsesSettingId).
 */
export async function getNeedsAttention(churchId: string, limit = 8) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Step 1: Get upcoming days with their services
  const dayServiceRows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      serviceId: services.id,
    })
    .from(liturgicalDays)
    .leftJoin(
      services,
      and(
        eq(services.liturgicalDayId, liturgicalDays.id),
        eq(services.churchId, churchId)
      )
    )
    .where(gte(liturgicalDays.date, today))
    .orderBy(asc(liturgicalDays.date))
    .limit(60);

  // Collect all service IDs that exist
  const serviceIds = dayServiceRows
    .filter((r) => r.serviceId !== null)
    .map((r) => r.serviceId!);

  // Step 2: For services that exist, count slots with actual content assigned
  let filledSlotCounts = new Map<string, number>();
  if (serviceIds.length > 0) {
    const slotRows = await db
      .select({
        serviceId: musicSlots.serviceId,
        filledCount: sql<number>`count(case when ${musicSlots.hymnId} is not null or ${musicSlots.anthemId} is not null or ${musicSlots.freeText} is not null or ${musicSlots.massSettingId} is not null or ${musicSlots.canticleSettingId} is not null or ${musicSlots.responsesSettingId} is not null then 1 end)`.as("filled_count"),
      })
      .from(musicSlots)
      .where(inArray(musicSlots.serviceId, serviceIds))
      .groupBy(musicSlots.serviceId);

    for (const row of slotRows) {
      filledSlotCounts.set(row.serviceId, row.filledCount);
    }
  }

  // Step 3: Group by day and determine attention status
  const dayMap = new Map<string, typeof dayServiceRows>();
  for (const row of dayServiceRows) {
    if (!dayMap.has(row.dayId)) dayMap.set(row.dayId, []);
    dayMap.get(row.dayId)!.push(row);
  }

  interface AttentionItem {
    id: string; date: string; cwName: string; colour: string; reason: string;
  }
  const result: AttentionItem[] = [];

  for (const [dayId, dRows] of dayMap) {
    const first = dRows[0];
    if (!first.serviceId) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No services created" });
      continue;
    }
    // Check if ANY service for this day has zero filled music slots
    const hasEmptyService = dRows.some((r) => {
      if (!r.serviceId) return false;
      const filled = filledSlotCounts.get(r.serviceId) ?? 0;
      return filled === 0;
    });
    if (hasEmptyService) {
      result.push({ id: dayId, date: first.date, cwName: first.cwName, colour: first.colour, reason: "No music assigned" });
    }
  }

  return result.slice(0, limit);
}

/** Get music slots for services with resolved hymn/anthem names (for member view).
 * Follows the same join pattern as the Sundays page query. */
export async function getMusicForServices(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, { slotType: string; title: string }[]>();

  const slots = await db
    .select({
      serviceId: musicSlots.serviceId,
      slotType: musicSlots.slotType,
      freeText: musicSlots.freeText,
      hymnFirstLine: hymns.firstLine,
      anthemTitle: anthems.title,
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .where(inArray(musicSlots.serviceId, serviceIds))
    .orderBy(asc(musicSlots.positionOrder));

  const result = new Map<string, { slotType: string; title: string }[]>();
  for (const slot of slots) {
    // Only include slots that have content assigned
    const title = slot.hymnFirstLine ?? slot.anthemTitle ?? slot.freeText;
    if (!title) continue;
    if (!result.has(slot.serviceId)) result.set(slot.serviceId, []);
    result.get(slot.serviceId)!.push({ slotType: slot.slotType, title });
  }
  return result;
}

/** Get availability for a specific user across services */
export async function getUserAvailability(userId: string, serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select()
    .from(availability)
    .where(and(eq(availability.userId, userId), inArray(availability.serviceId, serviceIds)));

  const result = new Map<string, string>();
  for (const row of rows) result.set(row.serviceId, row.status);
  return result;
}

/** Get next N upcoming days with their services (for member availability list) */
export async function getUpcomingDaysWithServices(churchId: string, limit = 6) {
  const today = format(new Date(), "yyyy-MM-dd");

  const rows = await db
    .select({
      dayId: liturgicalDays.id,
      date: liturgicalDays.date,
      cwName: liturgicalDays.cwName,
      colour: liturgicalDays.colour,
      serviceId: services.id,
    })
    .from(liturgicalDays)
    .leftJoin(services, and(eq(services.liturgicalDayId, liturgicalDays.id), eq(services.churchId, churchId)))
    .where(gte(liturgicalDays.date, today))
    .orderBy(asc(liturgicalDays.date))
    .limit(limit * 4);

  const dayMap = new Map<string, { id: string; date: string; cwName: string; colour: string; serviceIds: string[] }>();
  for (const row of rows) {
    if (!dayMap.has(row.dayId)) dayMap.set(row.dayId, { id: row.dayId, date: row.date, cwName: row.cwName, colour: row.colour, serviceIds: [] });
    if (row.serviceId) dayMap.get(row.dayId)!.serviceIds.push(row.serviceId);
  }

  return [...dayMap.values()].slice(0, limit);
}
