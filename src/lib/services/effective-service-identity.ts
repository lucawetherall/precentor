/**
 * Single source of truth for a service's *effective* identity and readings.
 *
 * A service may carry a `specialFeastKey` — a transferred Festival, a
 * same-Sunday alternate provision, or a traditional-name emphasis. When it
 * does, its title (and, for feasts, colour, collect and readings) come from the
 * curated registry in `data/transferable-festivals.ts` — which resolves either
 * to an existing `lectionary-coe.json` entry or to inline (CW/Roman) readings —
 * NOT from the shared liturgical day (which is church-agnostic and must never
 * be mutated per church).
 *
 * Resolution order: the curated special (registry) first, then its
 * `lectionaryKey`/`key` entry in the bundled JSON, then the day itself.
 *
 * Every surface that shows a service's name/colour/collect/readings — the
 * service page, the PDF sheet builder, the planning grid, the dashboards —
 * routes through here so they always agree.
 */
import { buildReadingRowFields, type ReadingRowFields } from "@/lib/lectionary/mapper";
import type { LectionaryData, ServiceReadings } from "@/lib/lectionary/types";
import lectionaryDataRaw from "@/data/lectionary-coe.json";
import {
  TRANSFERABLE_SPECIALS,
  type TransferableSpecial,
  type InlineReadings,
} from "@/data/transferable-festivals";

const lectionaryData = lectionaryDataRaw as unknown as LectionaryData;
const SPECIALS_BY_KEY = new Map<string, TransferableSpecial>(
  TRANSFERABLE_SPECIALS.map((s) => [s.key, s]),
);

type LectionaryYear = "A" | "B" | "C";
function asYear(value: string | null): LectionaryYear | null {
  return value === "A" || value === "B" || value === "C" ? value : null;
}

/** Resolve inline readings (one set, or a per-year map) for a lectionary year. */
function pickInlineReadings(
  readings: InlineReadings,
  year: LectionaryYear | null,
): ServiceReadings | null {
  if ("principal" in readings) return readings; // same every year
  return year ? readings[year] : null; // per-year needs a known year
}

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
  /** Footnote (e.g. rose vestments, "Common of the BVM", "Roman Rite"). */
  note: string | null;
  /** Provenance of a Roman-Rite borrowing, else null. */
  rite: "CW" | "ROMAN" | null;
}

/** A synthesized reading row for a transferred Festival (render-only). */
export type EffectiveReading = ReadingRowFields & {
  id: string;
  liturgicalDayId: string;
};

/**
 * Resolve the title / colour / collect a service should display. With no
 * `specialFeastKey`, or an unknown one, returns the day's own values.
 *
 * - emphasis → title only; the day's colour/season/collect/readings are kept.
 * - transferred/alternate → full identity from the special (registry → JSON).
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
    note: null,
    rite: null,
  };
  if (!specialFeastKey) return base;

  const special = SPECIALS_BY_KEY.get(specialFeastKey);
  const entry = lectionaryData.sundays[special?.lectionaryKey ?? specialFeastKey];
  if (!special && !entry) return base; // defensive: unknown key → regular day

  const note = special?.note ?? null;
  const rite = special?.rite ?? null;

  // Emphasis: a traditional name only. Keep the day's colour, season, collect.
  if (special?.kind === "emphasis") {
    return {
      ...base,
      title: special.name ?? entry?.name ?? day.cwName,
      isSpecial: true,
      specialFeastKey,
      note,
      rite,
    };
  }

  return {
    title: special?.name ?? entry?.name ?? day.cwName,
    colour: special?.colour ?? entry?.colour ?? day.colour,
    season: entry?.season ?? day.season,
    collect: special?.collect ?? entry?.collect ?? null,
    postCommunion: entry?.postCommunion ?? null,
    isSpecial: true,
    specialFeastKey,
    note,
    rite,
  };
}

/**
 * Synthesize the readings for a special from the registry (inline readings) or
 * the bundled lectionary (`lectionaryKey`/`key`), for the given lectionary
 * year. Returns null when there is no special, it's a title-only emphasis, the
 * key is unknown, or that year's readings are missing — the caller then keeps
 * the regular liturgical-day readings.
 */
export function synthesizeSpecialReadings(args: {
  specialFeastKey: string | null;
  lectionaryYear: string | null;
  liturgicalDayId: string;
}): EffectiveReading[] | null {
  const { specialFeastKey, lectionaryYear, liturgicalDayId } = args;
  if (!specialFeastKey) return null;

  const special = SPECIALS_BY_KEY.get(specialFeastKey);
  if (special?.kind === "emphasis") return null; // keep the day's readings

  const year = asYear(lectionaryYear);
  const stamp = (rows: ReadingRowFields[]) =>
    rows.map((r, i) => ({ ...r, id: `special:${specialFeastKey}:${i}`, liturgicalDayId }));

  // Inline readings (feasts not in the bundled JSON) take priority.
  if (special?.readings) {
    const sr = pickInlineReadings(special.readings, year);
    return sr ? stamp(buildReadingRowFields(sr)) : null;
  }

  // Otherwise pull from the bundled lectionary via lectionaryKey (or the key).
  const entry = lectionaryData.sundays[special?.lectionaryKey ?? specialFeastKey];
  if (!entry) return null;
  const yearReadings = year ? entry.years[year] : undefined;
  if (!yearReadings) return null;
  return stamp(buildReadingRowFields(yearReadings));
}
