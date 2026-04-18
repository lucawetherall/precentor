import type { MusicSlotType, HymnBook } from "@/types";
import type {
  MusicItemRow,
  MusicItemSegment,
  MusicItemLabel,
} from "@/types/music-list";

// ─── Input shape ────────────────────────────────────────────────────
//
// The label mapper is a pure function. It takes the pre-joined rows
// returned from the build-music-list-data.ts Drizzle query (one row per
// music slot) and emits the ordered list of `MusicItemRow` entries that
// the PDF renderer consumes.
//
// All nullable library fields are preserved as `| null` so the caller
// does not have to strip them — the mapper decides based on what is
// populated whether to fall back to freeText, to a library label, etc.

export interface MusicSlotRow {
  id: string;
  slotType: MusicSlotType;
  positionOrder: number;
  freeText: string | null;
  notes: string | null;
  hymnId: string | null;
  anthemId: string | null;
  massSettingId: string | null;
  canticleSettingId: string | null;
  responsesSettingId: string | null;
  hymn: {
    book: HymnBook;
    number: number;
    firstLine: string;
    composer: string | null;
  } | null;
  anthem: {
    title: string;
    composer: string;
    arranger: string | null;
  } | null;
  mass: {
    name: string;
    composer: string;
  } | null;
  canticle: {
    name: string | null;
    composer: string;
    key: string | null;
    canticle: string;
  } | null;
  responses: {
    name: string;
    composer: string;
  } | null;
}

// ─── parseComposerWork ──────────────────────────────────────────────

/**
 * Split a freeform "Composer, Work Title" string into renderable segments.
 *
 *  - empty/whitespace → [] (caller decides whether to emit an empty row)
 *  - contains ", " → [{plain: "<before>, "}, {italic: "<after>"}]
 *  - otherwise → [{plain: raw}]
 */
export function parseComposerWork(raw: string): MusicItemSegment[] {
  const trimmed = raw.trim();
  if (trimmed === "") return [];
  const commaIdx = trimmed.indexOf(", ");
  if (commaIdx === -1) {
    return [{ kind: "plain", text: trimmed }];
  }
  const before = trimmed.slice(0, commaIdx);
  const after = trimmed.slice(commaIdx + 2);
  return [
    { kind: "plain", text: `${before}, ` },
    { kind: "italic", text: after },
  ];
}

// ─── Helpers ────────────────────────────────────────────────────────

const MASS_MOVEMENT_LABEL: Record<string, string> = {
  MASS_SETTING_KYRIE: "Kyrie",
  MASS_SETTING_GLORIA: "Gloria",
  MASS_SETTING_SANCTUS: "Sanctus",
  MASS_SETTING_AGNUS: "Agnus",
  MASS_SETTING_GLOBAL: "Setting",
};

function composerWorkSegments(composer: string, work: string): MusicItemSegment[] {
  return [
    { kind: "plain", text: `${composer}, ` },
    { kind: "italic", text: work },
  ];
}

// ─── Main mapping ───────────────────────────────────────────────────

/**
 * Turn an ordered list of music-slot rows for ONE service into the canonical
 * list of `MusicItemRow` entries in music-list row order:
 *   Introit → Responses → Psalm → Setting → Canticles → Anthem(s)
 *   → Hymns → Voluntary → Offertory → Voluntary (after)
 *
 * Pure — no DB access, no side effects.
 */
export function musicSlotRowsForService(rows: MusicSlotRow[]): MusicItemRow[] {
  if (rows.length === 0) return [];

  // Sort defensively by positionOrder so output is deterministic even if
  // the caller fed us rows out of order.
  const sorted = [...rows].sort((a, b) => a.positionOrder - b.positionOrder);

  // Find the first HYMN position for introit detection
  const firstHymnPosition = sorted.find((r) => r.slotType === "HYMN")?.positionOrder;

  // Collectors (will be consumed below in the fixed output order).
  //
  // Note: `introit`, `other`, `responses`, and `psalm` are scalar (single-slot)
  // by design — the plan's label-mapping table caps each at 0–1 rows. If a
  // service has multiple OTHER/RESPONSES/PSALM slots, only the last one is
  // kept. Collector slots (mass-settings, canticles, anthems, hymns) dedupe
  // and join instead.
  let introit: MusicItemRow | null = null;
  let other: MusicItemRow | null = null;
  let responses: MusicItemRow | null = null;
  let psalm: MusicItemRow | null = null;

  // Mass-setting collector (dedupe by massSettingId OR composer+name for plainsong w/o id)
  const massSegments: MusicItemSegment[] = [];
  const seenMassIds = new Set<string>();
  const seenMassKeys = new Set<string>();

  // Canticle collector (dedupe by canticleSettingId)
  const canticleSegments: MusicItemSegment[] = [];
  const seenCanticleIds = new Set<string>();

  // Anthem collector
  const anthems: Array<{ composer: string; title: string }> = [];

  // Hymn collector
  const hymns: Array<{ book: HymnBook; number: number }> = [];

  let voluntaryPre: MusicItemRow | null = null;
  let offertory: MusicItemRow | null = null;
  let voluntaryPost: MusicItemRow | null = null;

  for (const row of sorted) {
    switch (row.slotType) {
      case "GOSPEL_ACCLAMATION":
        // Internal-only — omit entirely
        break;

      case "OTHER": {
        const raw = (row.freeText ?? "").trim();
        let label: MusicItemLabel = "Other";
        let stripped = raw;
        // Explicit prefix wins
        if (raw.toLowerCase().startsWith("introit:")) {
          label = "Introit";
          stripped = raw.slice("introit:".length).trim();
        } else if (
          firstHymnPosition !== undefined &&
          row.positionOrder < firstHymnPosition
        ) {
          label = "Introit";
        }
        const segments = parseComposerWork(stripped);
        if (segments.length === 0) break;
        const itemRow: MusicItemRow = { label, segments };
        if (label === "Introit") {
          introit = itemRow;
        } else {
          other = itemRow;
        }
        break;
      }

      case "RESPONSES": {
        const composer = row.responses?.composer?.trim() ?? "";
        const name = row.responses?.name?.trim() ?? "";
        const text = composer !== "" ? composer : name;
        if (text === "") break;
        responses = {
          label: "Responses",
          segments: [{ kind: "plain", text }],
        };
        break;
      }

      case "PSALM": {
        const main = (row.freeText ?? "").trim();
        const segments: MusicItemSegment[] =
          main !== ""
            ? [{ kind: "plain", text: main }]
            : [{ kind: "plain", text: "TBC" }];
        const subRaw = row.notes?.trim();
        psalm = {
          label: "Psalm",
          segments,
          ...(subRaw ? { sub: subRaw } : {}),
        };
        break;
      }

      case "MASS_SETTING_KYRIE":
      case "MASS_SETTING_GLORIA":
      case "MASS_SETTING_SANCTUS":
      case "MASS_SETTING_AGNUS":
      case "MASS_SETTING_GLOBAL": {
        if (!row.mass) break;
        const composer = row.mass.composer;
        const isPlainsong = composer.toLowerCase() === "plainsong";
        // Dedupe key: prefer massSettingId; fall back to composer+name
        const key = row.massSettingId ?? `${composer}::${row.mass.name}`;
        if (row.massSettingId && seenMassIds.has(row.massSettingId)) break;
        if (!row.massSettingId && seenMassKeys.has(key)) break;
        if (row.massSettingId) seenMassIds.add(row.massSettingId);
        else seenMassKeys.add(key);

        // Separator
        if (massSegments.length > 0) {
          massSegments.push({ kind: "plain", text: "; " });
        }

        if (isPlainsong) {
          const movement = MASS_MOVEMENT_LABEL[row.slotType] ?? "Setting";
          massSegments.push({ kind: "plain", text: `Plainsong ${movement}` });
        } else {
          for (const seg of composerWorkSegments(composer, row.mass.name)) {
            massSegments.push(seg);
          }
        }
        break;
      }

      case "CANTICLE_MAGNIFICAT":
      case "CANTICLE_NUNC_DIMITTIS": {
        if (!row.canticle) break;
        // Dedupe by canticleSettingId only — if null we cannot safely dedupe
        if (row.canticleSettingId) {
          if (seenCanticleIds.has(row.canticleSettingId)) break;
          seenCanticleIds.add(row.canticleSettingId);
        }

        const composer = row.canticle.composer;
        const name = row.canticle.name?.trim() ?? "";
        const key = row.canticle.key?.trim() ?? "";

        if (canticleSegments.length > 0) {
          canticleSegments.push({ kind: "plain", text: "; " });
        }

        if (name !== "") {
          for (const seg of composerWorkSegments(composer, name)) {
            canticleSegments.push(seg);
          }
        } else if (key !== "") {
          canticleSegments.push({
            kind: "plain",
            text: `${composer} in ${key}`,
          });
        } else {
          canticleSegments.push({ kind: "plain", text: composer });
        }
        break;
      }

      case "ANTHEM": {
        if (!row.anthem) break;
        anthems.push({ composer: row.anthem.composer, title: row.anthem.title });
        break;
      }

      case "HYMN": {
        if (!row.hymn) break;
        hymns.push({ book: row.hymn.book, number: row.hymn.number });
        break;
      }

      case "ORGAN_VOLUNTARY_PRE": {
        const segs = parseComposerWork(row.freeText ?? "");
        if (segs.length === 0) break;
        voluntaryPre = { label: "Voluntary", segments: segs };
        break;
      }

      case "ORGAN_VOLUNTARY_OFFERTORY": {
        const segs = parseComposerWork(row.freeText ?? "");
        if (segs.length === 0) break;
        offertory = { label: "Offertory", segments: segs };
        break;
      }

      case "ORGAN_VOLUNTARY_POST": {
        const segs = parseComposerWork(row.freeText ?? "");
        if (segs.length === 0) break;
        voluntaryPost = { label: "Voluntary (after)", segments: segs };
        break;
      }

      default: {
        // Exhaustive guard — MusicSlotType is a closed union. If any new
        // member is added later the compiler will flag this branch.
        const _exhaustive: never = row.slotType;
        void _exhaustive;
      }
    }
  }

  // Compose output in canonical order
  const out: MusicItemRow[] = [];

  if (introit) out.push(introit);
  if (responses) out.push(responses);
  if (psalm) out.push(psalm);

  if (massSegments.length > 0) {
    out.push({ label: "Setting", segments: massSegments });
  }

  if (canticleSegments.length > 0) {
    out.push({ label: "Canticles", segments: canticleSegments });
  }

  if (anthems.length > 0) {
    const label: MusicItemLabel = anthems.length === 1 ? "Anthem" : "Anthems";
    const segs: MusicItemSegment[] = [];
    anthems.forEach((a, idx) => {
      if (idx > 0) segs.push({ kind: "linebreak" });
      segs.push({ kind: "plain", text: `${a.composer}, ` });
      segs.push({ kind: "italic", text: a.title });
    });
    out.push({ label, segments: segs });
  }

  if (hymns.length > 0) {
    const segs: MusicItemSegment[] = [];
    hymns.forEach((h, idx) => {
      if (idx > 0) segs.push({ kind: "plain", text: ", " });
      segs.push({ kind: "plain", text: `${h.book} ${h.number}` });
    });
    out.push({ label: "Hymns", segments: segs });
  }

  if (voluntaryPre) out.push(voluntaryPre);
  if (offertory) out.push(offertory);
  if (voluntaryPost) out.push(voluntaryPost);

  if (other) out.push(other);

  return out;
}
