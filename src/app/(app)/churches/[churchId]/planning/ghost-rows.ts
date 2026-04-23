import { addDays, format, parseISO } from "date-fns";

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

export interface GhostRow {
  ghostId: string;
  date: string;
  serviceType: ServiceType;
  time: string | null;
}

export function computeGhostRows(args: {
  from: string;
  to: string;
  patterns: PatternInput[];
  existingServices: ExistingServiceRef[];
}): GhostRow[] {
  const existingKey = new Set(
    args.existingServices.map((s) => `${s.date}:${s.serviceType}`)
  );

  const start = parseISO(args.from);
  const end = parseISO(args.to);
  const ghosts: GhostRow[] = [];

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

  return ghosts;
}
