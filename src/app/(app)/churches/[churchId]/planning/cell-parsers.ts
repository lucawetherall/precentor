export interface ParsedHymnEntry {
  raw: string;
  number: number | null;
}

export function parseHymnList(input: string): ParsedHymnEntry[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) return [];

  let tokens: string[];
  if (trimmed.includes(",")) {
    // Split by comma first, then further split each comma-segment by whitespace
    // (handles "117 , 103  271, 295" → ["117", "103", "271", "295"])
    // BUT preserve multi-word text tokens like "King of glory" (they won't be
    // all-numeric, so they survive as a single comma-delimited segment already).
    tokens = trimmed
      .split(",")
      .flatMap((seg) => {
        const s = seg.trim();
        if (s.length === 0) return [];
        // If the segment contains whitespace AND is not all-numeric,
        // it could be a multi-word text entry — keep it intact.
        // If it contains whitespace and every space-separated part is numeric,
        // split it further.
        const parts = s.split(/\s+/).filter((p) => p.length > 0);
        if (parts.every((p) => /^\d+$/.test(p))) {
          return parts;
        }
        return [s];
      });
  } else {
    tokens = trimmed.split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 0);
  }

  return tokens.map((raw) => {
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    return { raw, number: Number.isFinite(n) ? n : null };
  });
}

// ─── Psalm parser ─────────────────────────────────────────────

export interface ParsedPsalm {
  raw: string;
  number: number | null;
  valid: boolean;
}

export function parsePsalm(input: string): ParsedPsalm {
  const raw = input.trim();
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= 150) return { raw, number: n, valid: true };
    return { raw, number: null, valid: false };
  }
  return { raw, number: null, valid: false };
}

// ─── Service-type alias resolver ──────────────────────────────

// Values mirror the serviceTypeEnum in schema-base.ts exactly.
type ServiceType =
  | "SUNG_EUCHARIST"
  | "CHORAL_EVENSONG"
  | "SAID_EUCHARIST"
  | "CHORAL_MATINS"
  | "FAMILY_SERVICE"
  | "COMPLINE"
  | "CUSTOM";

const SERVICE_TYPE_VALUES: ServiceType[] = [
  "SUNG_EUCHARIST",
  "CHORAL_EVENSONG",
  "SAID_EUCHARIST",
  "CHORAL_MATINS",
  "FAMILY_SERVICE",
  "COMPLINE",
  "CUSTOM",
];

const SERVICE_TYPE_ALIASES: Record<string, ServiceType> = {
  "sung eucharist": "SUNG_EUCHARIST",
  "said eucharist": "SAID_EUCHARIST",
  "choral evensong": "CHORAL_EVENSONG",
  evensong: "CHORAL_EVENSONG",
  "choral matins": "CHORAL_MATINS",
  mattins: "CHORAL_MATINS",
  matins: "CHORAL_MATINS",
  "family service": "FAMILY_SERVICE",
  compline: "COMPLINE",
  custom: "CUSTOM",
};

export function resolveServiceType(input: string): ServiceType | null {
  const s = input.trim();
  if (s.length === 0) return null;
  const upper = s.toUpperCase().replace(/[\s-]+/g, "_");
  if ((SERVICE_TYPE_VALUES as string[]).includes(upper)) return upper as ServiceType;
  const lower = s.toLowerCase();
  return SERVICE_TYPE_ALIASES[lower] ?? null;
}
