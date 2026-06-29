/**
 * Single source of truth for a service's *effective* identity and readings.
 *
 * A service may carry a `specialFeastKey` (a transferred Festival or a
 * same-Sunday alternate provision). When it does, its title, colour, collect,
 * post-communion and readings come from the festival's lectionary entry for the
 * day's lectionary year — NOT from the shared liturgical day (which is
 * church-agnostic and must never be mutated per church).
 *
 * Every surface that shows a service's name/colour/collect/readings — the
 * service page, the PDF sheet builder, the planning grid, the dashboards —
 * routes through here so they always agree.
 */
import { buildReadingRowFields, type ReadingRowFields } from "@/lib/lectionary/mapper";
import type { LectionaryData } from "@/lib/lectionary/types";
import lectionaryDataRaw from "@/data/lectionary-coe.json";

const lectionaryData = lectionaryDataRaw as unknown as LectionaryData;

/** The day fields the resolver reads. Matches the liturgical_days columns. */
export interface DayIdentityInput {
  cwName: string;
  colour: string;
  season: string;
  collect: string | null;
  postCommunion: string | null;
}

export interface EffectiveIdentity {
  title: string;
  colour: string;
  season: string;
  collect: string | null;
  postCommunion: string | null;
  isSpecial: boolean;
  specialFeastKey: string | null;
}

/** A synthesized reading row for a transferred Festival (render-only). */
export type EffectiveReading = ReadingRowFields & {
  id: string;
  liturgicalDayId: string;
};

/**
 * Resolve the title / colour / collect a service should display. With no
 * `specialFeastKey`, or an unknown one, returns the day's own values.
 */
export function resolveEffectiveServiceIdentity(args: {
  day: DayIdentityInput;
  specialFeastKey: string | null;
}): EffectiveIdentity {
  const { day, specialFeastKey } = args;
  const base: EffectiveIdentity = {
    title: day.cwName,
    colour: day.colour,
    season: day.season,
    collect: day.collect,
    postCommunion: day.postCommunion,
    isSpecial: false,
    specialFeastKey: null,
  };
  if (!specialFeastKey) return base;

  const entry = lectionaryData.sundays[specialFeastKey];
  if (!entry) return base; // defensive: unknown key falls back to the regular day

  return {
    title: entry.name,
    colour: entry.colour || day.colour,
    season: entry.season || day.season,
    collect: entry.collect ?? null,
    postCommunion: entry.postCommunion ?? null,
    isSpecial: true,
    specialFeastKey,
  };
}

/**
 * Synthesize the readings for a transferred Festival from bundled lectionary
 * data, for the given lectionary year. Returns null when there is no special,
 * the key is unknown, or that year's readings are missing — the caller then
 * keeps the regular liturgical-day readings.
 */
export function synthesizeSpecialReadings(args: {
  specialFeastKey: string | null;
  lectionaryYear: string | null;
  liturgicalDayId: string;
}): EffectiveReading[] | null {
  const { specialFeastKey, lectionaryYear, liturgicalDayId } = args;
  if (!specialFeastKey) return null;

  const entry = lectionaryData.sundays[specialFeastKey];
  if (!entry) return null;

  const year = lectionaryYear === "A" || lectionaryYear === "B" || lectionaryYear === "C"
    ? lectionaryYear
    : null;
  const yearReadings = year ? entry.years[year] : undefined;
  if (!yearReadings) return null;

  return buildReadingRowFields(yearReadings).map((r, i) => ({
    ...r,
    id: `special:${specialFeastKey}:${i}`,
    liturgicalDayId,
  }));
}
