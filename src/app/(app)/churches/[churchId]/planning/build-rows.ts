import { computeGhostRows } from "./ghost-rows";
import type { ExistingServiceRef } from "./ghost-rows";
import type { ApiDay, ApiReading, ApiResponse, ApiService, ApiSlot } from "./api-types";
import type { PlanningRow, ReadingsDisplay } from "./types";
import { resolveLectionaryTrack, filterReadingsByTrack } from "@/lib/lectionary/track";
import type { LectionaryTrack } from "@/lib/churches/settings";
import {
  cellText,
  deriveAnthem,
  deriveChant,
  deriveHymns,
  deriveIntroit,
  derivePsalm,
  deriveRespAccl,
  deriveSetting,
  deriveVoluntary,
  emptyCell,
} from "./derive-cells";

function buildRealRow(
  svc: ApiService,
  day: ApiDay,
  slotsByService: Map<string, ApiSlot[]>,
  readingsByDay: Map<string, ApiReading[]>,
  defaultTrack: LectionaryTrack,
): PlanningRow {
  const slots = slotsByService.get(svc.id) ?? [];
  const isEvensong = svc.serviceType === "CHORAL_EVENSONG";
  const dayReadings = readingsByDay.get(svc.liturgicalDayId) ?? [];

  // Show only the active track's psalm (resolved per service). The OT reading,
  // epistle and gospel are untagged and always shown.
  const track = resolveLectionaryTrack(svc.lectionaryTrack, defaultTrack);
  const readings: ReadingsDisplay[] = filterReadingsByTrack(
    dayReadings.filter((r) => r.lectionary === "PRINCIPAL"),
    track,
  ).map((r) => ({ ref: r.reference, text: r.bookName ?? null }));

  return {
    kind: "real",
    serviceId: svc.id,
    date: day.date,
    serviceType: svc.serviceType,
    time: svc.time,
    liturgicalDayId: svc.liturgicalDayId,
    updatedAt: svc.updatedAt instanceof Date ? svc.updatedAt.toISOString() : svc.updatedAt,
    cells: {
      introit: deriveIntroit(slots),
      hymns: deriveHymns(slots),
      setting: deriveSetting(slots, isEvensong),
      psalm: derivePsalm(slots),
      chant: deriveChant(slots),
      respAccl: deriveRespAccl(slots, isEvensong),
      anthem: deriveAnthem(slots),
      voluntary: deriveVoluntary(slots),
      info: cellText(svc.notes ?? ""),
    },
    readings,
  };
}

function rowSortKey(row: PlanningRow): string {
  return `${row.date}T${row.time ?? "00:00"}`;
}

export function buildRowsFromApi(data: ApiResponse, from: string, to: string): PlanningRow[] {
  const daysById = new Map<string, ApiDay>(data.days.map((d) => [d.id, d]));

  const slotsByService = new Map<string, ApiSlot[]>();
  for (const slot of data.slots) {
    const existing = slotsByService.get(slot.serviceId) ?? [];
    existing.push(slot);
    slotsByService.set(slot.serviceId, existing);
  }

  const readingsByDay = new Map<string, ApiReading[]>();
  for (const reading of data.readings) {
    const existing = readingsByDay.get(reading.liturgicalDayId) ?? [];
    existing.push(reading);
    readingsByDay.set(reading.liturgicalDayId, existing);
  }

  const defaultTrack: LectionaryTrack = data.lectionaryTrackDefault ?? "CONTINUOUS";
  const realRows: PlanningRow[] = [];
  for (const svc of data.services) {
    const day = daysById.get(svc.liturgicalDayId);
    if (!day) continue;
    realRows.push(buildRealRow(svc, day, slotsByService, readingsByDay, defaultTrack));
  }

  const existingRefs: ExistingServiceRef[] = data.services
    .map((s) => ({
      date: daysById.get(s.liturgicalDayId)?.date ?? "",
      serviceType: s.serviceType as ExistingServiceRef["serviceType"],
    }))
    .filter((r) => r.date !== "");

  const ghosts = computeGhostRows({
    from,
    to,
    patterns: data.patterns,
    existingServices: existingRefs,
    qualifyingDays: data.days.map((d) => ({
      date: d.date,
      sundayKey: d.sundayKey,
      section: d.section,
    })),
  });

  const ghostRows: PlanningRow[] = ghosts.map((g) => ({
    kind: "ghost",
    ghostId: g.ghostId,
    date: g.date,
    serviceType: g.serviceType,
    time: g.time,
    cells: {
      introit: emptyCell(),
      hymns: emptyCell(),
      setting: emptyCell(),
      psalm: emptyCell(),
      chant: emptyCell(),
      respAccl: emptyCell(),
      anthem: emptyCell(),
      voluntary: emptyCell(),
      info: emptyCell(),
    },
    readings: [],
  }));

  return [...realRows, ...ghostRows].sort((a, b) => rowSortKey(a).localeCompare(rowSortKey(b)));
}
