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
