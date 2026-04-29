import { addDays, format, parseISO } from "date-fns";
import { isQualifyingDay } from "./principal-feasts";

// Values mirror serviceTypeEnum in schema-base.ts exactly.
type ServiceType =
  | "SUNG_EUCHARIST"
  | "CHORAL_EVENSONG"
  | "SAID_EUCHARIST"
  | "CHORAL_MATINS"
  | "FAMILY_SERVICE"
  | "COMPLINE"
  | "CUSTOM";

export interface PatternInput {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  serviceType: ServiceType;
  time: string | null;
  enabled: boolean;
}

export interface ExistingServiceRef {
  date: string;
  serviceType: ServiceType;
}

export interface QualifyingDayInput {
  date: string;
  sundayKey: string | null;
  section: string | null;
}

export interface GhostRow {
  ghostId: string;
  date: string;
  serviceType: ServiceType;
  time: string | null;
}

const FALLBACK_TYPE: ServiceType = "SUNG_EUCHARIST";

export function computeGhostRows(args: {
  from: string;
  to: string;
  patterns: PatternInput[];
  existingServices: ExistingServiceRef[];
  qualifyingDays?: QualifyingDayInput[];
}): GhostRow[] {
  const existingKey = new Set(
    args.existingServices.map((s) => `${s.date}:${s.serviceType}`),
  );

  const start = parseISO(args.from);
  const end = parseISO(args.to);
  const ghosts: GhostRow[] = [];

  // Pattern-driven ghosts (existing behaviour).
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const date = format(d, "yyyy-MM-dd");
    const dow = d.getDay();

    for (const p of args.patterns) {
      if (!p.enabled) continue;
      if (p.dayOfWeek !== dow) continue;
      const key = `${date}:${p.serviceType}`;
      if (existingKey.has(key)) continue;
      ghosts.push({
        ghostId: `ghost:${date}:${p.serviceType}`,
        date,
        serviceType: p.serviceType,
        time: p.time,
      });
    }
  }

  // Fallback ghosts: every qualifying day that ended up with zero rows
  // (no existing service, no pattern-driven ghost) gets a SUNG_EUCHARIST row.
  if (args.qualifyingDays && args.qualifyingDays.length > 0) {
    const datesWithRow = new Set<string>();
    for (const r of args.existingServices) datesWithRow.add(r.date);
    for (const g of ghosts) datesWithRow.add(g.date);

    for (const q of args.qualifyingDays) {
      if (datesWithRow.has(q.date)) continue;
      if (!isQualifyingDay(q.date, q.sundayKey, q.section)) continue;
      ghosts.push({
        ghostId: `ghost:${q.date}:${FALLBACK_TYPE}`,
        date: q.date,
        serviceType: FALLBACK_TYPE,
        time: null,
      });
    }
  }

  return ghosts;
}
