import { describe, it, expect } from "vitest";
import {
  musicSlotRowsForService,
  parseComposerWork,
  type MusicSlotRow,
} from "../label-mapping";
import type { MusicSlotType } from "@/types";

// ─── Fixture helpers ────────────────────────────────────────────

let idCounter = 1;
function makeRow(
  slotType: MusicSlotType,
  positionOrder: number,
  overrides: Partial<MusicSlotRow> = {},
): MusicSlotRow {
  return {
    id: `slot-${idCounter++}`,
    slotType,
    positionOrder,
    freeText: null,
    notes: null,
    hymnId: null,
    anthemId: null,
    massSettingId: null,
    canticleSettingId: null,
    responsesSettingId: null,
    hymn: null,
    anthem: null,
    mass: null,
    canticle: null,
    responses: null,
    ...overrides,
  };
}

function anthemRow(
  position: number,
  composer: string,
  title: string,
  id = `anthem-${idCounter++}`,
): MusicSlotRow {
  return makeRow("ANTHEM", position, {
    anthemId: id,
    anthem: { title, composer, arranger: null },
  });
}

function hymnRow(
  position: number,
  book: "NEH" | "AM",
  number: number,
  id = `hymn-${idCounter++}`,
): MusicSlotRow {
  return makeRow("HYMN", position, {
    hymnId: id,
    hymn: { book, number, firstLine: "n/a", composer: null },
  });
}

function massRow(
  slotType: MusicSlotType,
  position: number,
  composer: string,
  name: string,
  settingId: string | null = `mass-${idCounter++}`,
): MusicSlotRow {
  return makeRow(slotType, position, {
    massSettingId: settingId,
    mass: { name, composer },
  });
}

function canticleRow(
  slotType: "CANTICLE_MAGNIFICAT" | "CANTICLE_NUNC_DIMITTIS",
  position: number,
  composer: string,
  name: string | null,
  settingId: string | null = `cant-${idCounter++}`,
  key: string | null = null,
): MusicSlotRow {
  return makeRow(slotType, position, {
    canticleSettingId: settingId,
    canticle: {
      name,
      composer,
      key,
      canticle: slotType === "CANTICLE_MAGNIFICAT" ? "MAGNIFICAT" : "NUNC_DIMITTIS",
    },
  });
}

// ─── parseComposerWork unit tests ───────────────────────────────

describe("parseComposerWork", () => {
  it("returns [] on empty input", () => {
    expect(parseComposerWork("")).toEqual([]);
    expect(parseComposerWork("   ")).toEqual([]);
  });

  it("splits at first comma-space", () => {
    expect(parseComposerWork("Stanford, O for a closer walk")).toEqual([
      { kind: "plain", text: "Stanford, " },
      { kind: "italic", text: "O for a closer walk" },
    ]);
  });

  it("returns single plain segment if no comma-space", () => {
    expect(parseComposerWork("Trad")).toEqual([{ kind: "plain", text: "Trad" }]);
  });
});

// ─── Test 5: Single ANTHEM ──────────────────────────────────────

describe("musicSlotRowsForService (label-mapping)", () => {
  it("single ANTHEM → label 'Anthem', 2 segments", () => {
    const rows = [anthemRow(10, "Stanford", "O for a closer walk with God")];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Anthem");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Stanford, " },
      { kind: "italic", text: "O for a closer walk with God" },
    ]);
  });

  // ─── Test 6 ───────────────────────────────────────────────────
  it("two ANTHEMs → label 'Anthems', linebreak segment present", () => {
    const rows = [
      anthemRow(10, "Lloyd", "View me, Lord"),
      anthemRow(11, "Elgar", "Ave verum corpus"),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Anthems");
    const kinds = out[0].segments.map((s) => s.kind);
    expect(kinds).toContain("linebreak");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Lloyd, " },
      { kind: "italic", text: "View me, Lord" },
      { kind: "linebreak" },
      { kind: "plain", text: "Elgar, " },
      { kind: "italic", text: "Ave verum corpus" },
    ]);
  });

  // ─── Test 7 ───────────────────────────────────────────────────
  it("Magnificat + Nunc Dimittis with SAME canticleSettingId → single Canticles row, one entry", () => {
    const rows = [
      canticleRow("CANTICLE_MAGNIFICAT", 5, "Stanford", "Service in B♭", "stanford-b"),
      canticleRow("CANTICLE_NUNC_DIMITTIS", 6, "Stanford", "Service in B♭", "stanford-b"),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Canticles");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Stanford, " },
      { kind: "italic", text: "Service in B♭" },
    ]);
  });

  // ─── Test 8 ───────────────────────────────────────────────────
  it("Mag + Nunc with DIFFERENT setting ids → single Canticles row, two joined entries", () => {
    const rows = [
      canticleRow("CANTICLE_MAGNIFICAT", 5, "Stanford", "Service in B♭", "stanford-b"),
      canticleRow("CANTICLE_NUNC_DIMITTIS", 6, "Howells", "Collegium Regale", "howells-cr"),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Canticles");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Stanford, " },
      { kind: "italic", text: "Service in B♭" },
      { kind: "plain", text: "; " },
      { kind: "plain", text: "Howells, " },
      { kind: "italic", text: "Collegium Regale" },
    ]);
  });

  // ─── Test 9 ───────────────────────────────────────────────────
  it("4 mass-setting slots all same setting → single Setting row, one entry", () => {
    const rows = [
      massRow("MASS_SETTING_KYRIE", 1, "Byrd", "Mass for Four Voices", "byrd-4"),
      massRow("MASS_SETTING_GLORIA", 2, "Byrd", "Mass for Four Voices", "byrd-4"),
      massRow("MASS_SETTING_SANCTUS", 6, "Byrd", "Mass for Four Voices", "byrd-4"),
      massRow("MASS_SETTING_AGNUS", 7, "Byrd", "Mass for Four Voices", "byrd-4"),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Setting");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Byrd, " },
      { kind: "italic", text: "Mass for Four Voices" },
    ]);
  });

  // ─── Test 10 ──────────────────────────────────────────────────
  it("MASS_GLORIA plainsong + MASS_GLOBAL MacMillan → single Setting row collapsed", () => {
    const rows = [
      massRow(
        "MASS_SETTING_GLORIA",
        2,
        "Plainsong",
        "Missa de Angelis",
        "plainsong-gloria",
      ),
      massRow(
        "MASS_SETTING_GLOBAL",
        3,
        "MacMillan",
        "St Anne's Mass",
        "macmillan-st-anne",
      ),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Setting");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Plainsong Gloria" },
      { kind: "plain", text: "; " },
      { kind: "plain", text: "MacMillan, " },
      { kind: "italic", text: "St Anne's Mass" },
    ]);
  });

  // ─── Test 11 ──────────────────────────────────────────────────
  it("GOSPEL_ACCLAMATION → omitted", () => {
    const rows = [
      makeRow("GOSPEL_ACCLAMATION", 4, { freeText: "Alleluia" }),
      anthemRow(10, "Stanford", "Beati quorum via"),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Anthem");
  });

  // ─── Test 12 ──────────────────────────────────────────────────
  it("OTHER at position 0 (before any HYMN) → emitted as Introit", () => {
    const rows = [
      makeRow("OTHER", 0, { freeText: "Palestrina, Sicut cervus" }),
      hymnRow(1, "NEH", 372),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out[0].label).toBe("Introit");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Palestrina, " },
      { kind: "italic", text: "Sicut cervus" },
    ]);
  });

  it("OTHER with explicit 'introit:' prefix → emitted as Introit, prefix stripped", () => {
    const rows = [
      makeRow("OTHER", 20, { freeText: "introit: Tallis, If ye love me" }),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Introit");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "Tallis, " },
      { kind: "italic", text: "If ye love me" },
    ]);
  });

  // ─── Test 13 ──────────────────────────────────────────────────
  it("Mixed HYMN NEH + HYMN AM → single Hymns row, comma-joined", () => {
    const rows = [
      hymnRow(5, "NEH", 372),
      hymnRow(6, "NEH", 144),
      hymnRow(7, "AM", 226),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Hymns");
    expect(out[0].segments).toEqual([
      { kind: "plain", text: "NEH 372" },
      { kind: "plain", text: ", " },
      { kind: "plain", text: "NEH 144" },
      { kind: "plain", text: ", " },
      { kind: "plain", text: "AM 226" },
    ]);
  });

  // ─── Test 14 ──────────────────────────────────────────────────
  it("empty slot rows → items []", () => {
    expect(musicSlotRowsForService([])).toEqual([]);
  });

  // ─── Extra coverage: Psalm with notes ─────────────────────────
  it("PSALM with notes populates sub", () => {
    const rows = [
      makeRow("PSALM", 3, { freeText: "31. 1\u20135, 15\u201316", notes: "Garrett" }),
    ];
    const out = musicSlotRowsForService(rows);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Psalm");
    expect(out[0].segments).toEqual([{ kind: "plain", text: "31. 1\u20135, 15\u201316" }]);
    expect(out[0].sub).toBe("Garrett");
  });

  // ─── Row order check ──────────────────────────────────────────
  it("outputs rows in canonical order (Introit → Responses → Psalm → Setting → Canticles → Anthem → Hymns → Voluntary → Offertory → Voluntary (after))", () => {
    const rows = [
      makeRow("ORGAN_VOLUNTARY_POST", 20, { freeText: "Bach, Fugue in G" }),
      anthemRow(10, "Stanford", "Beati"),
      hymnRow(5, "NEH", 1),
      makeRow("ORGAN_VOLUNTARY_PRE", 0, { freeText: "Bach, Prelude in C" }),
      makeRow("PSALM", 3, { freeText: "23" }),
      makeRow("OTHER", -1, { freeText: "Tallis, If ye love me" }),
    ];
    const out = musicSlotRowsForService(rows);
    const labels = out.map((r) => r.label);
    expect(labels).toEqual([
      "Introit",
      "Psalm",
      "Anthem",
      "Hymns",
      "Voluntary",
      "Voluntary (after)",
    ]);
  });
});
