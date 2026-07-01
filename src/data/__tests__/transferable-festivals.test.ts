import { describe, it, expect } from "vitest";
import { TRANSFERABLE_SPECIALS } from "../transferable-festivals";
import type { ServiceReadings } from "@/lib/lectionary/types";
import lectionaryData from "../lectionary-coe.json";

const sundays = (lectionaryData as { sundays: Record<string, { name: string; years: Record<string, { principal?: unknown[] }> }> }).sundays;

const hasAllYears = (key: string) =>
  ["A", "B", "C"].every((y) => (sundays[key]?.years?.[y]?.principal?.length ?? 0) > 0);

function principalCount(r: ServiceReadings | { A: ServiceReadings; B: ServiceReadings; C: ServiceReadings }): number {
  if ("principal" in r) return r.principal.length;
  return Math.min(r.A.principal.length, r.B.principal.length, r.C.principal.length);
}

describe("TRANSFERABLE_SPECIALS data integrity", () => {
  it("has no duplicate keys", () => {
    const keys = TRANSFERABLE_SPECIALS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry resolves a readings source or is a title-only emphasis", () => {
    for (const s of TRANSFERABLE_SPECIALS) {
      if (s.kind === "emphasis") {
        expect(s.name, `${s.key} emphasis needs a name`).toBeTruthy();
        expect(s.appliesToSundayKey, `${s.key} emphasis needs appliesToSundayKey`).toBeTruthy();
        expect(s.readings, `${s.key} emphasis must NOT carry readings`).toBeUndefined();
        continue;
      }
      // transferred / alternate must resolve readings one of three ways
      const viaInline = !!s.readings && principalCount(s.readings) > 0;
      const viaLectionaryKey = !!s.lectionaryKey && hasAllYears(s.lectionaryKey);
      const viaOwnKey = hasAllYears(s.key);
      expect(
        viaInline || viaLectionaryKey || viaOwnKey,
        `${s.key} has no valid readings source`,
      ).toBe(true);
    }
  });

  it("transferred entries carry a fixed date or an Easter offset", () => {
    for (const s of TRANSFERABLE_SPECIALS.filter((x) => x.kind === "transferred")) {
      const fixed = s.month != null && s.day != null;
      const movable = s.easterOffsetDays != null;
      expect(fixed || movable, `${s.key} needs month/day or easterOffsetDays`).toBe(true);
      if (fixed) {
        expect(s.month!).toBeGreaterThanOrEqual(1);
        expect(s.month!).toBeLessThanOrEqual(12);
        expect(s.day!).toBeGreaterThanOrEqual(1);
        expect(s.day!).toBeLessThanOrEqual(31);
      }
    }
  });

  it("alternate / emphasis entries reference an existing Sunday key", () => {
    for (const s of TRANSFERABLE_SPECIALS.filter((x) => x.kind !== "transferred")) {
      expect(s.appliesToSundayKey, `${s.key} needs appliesToSundayKey`).toBeTruthy();
      expect(sundays[s.appliesToSundayKey!], `unknown appliesToSundayKey ${s.appliesToSundayKey}`).toBeTruthy();
    }
  });

  it("every lectionaryKey exists with full A/B/C readings", () => {
    for (const s of TRANSFERABLE_SPECIALS) {
      if (!s.lectionaryKey) continue;
      expect(hasAllYears(s.lectionaryKey), `${s.key} lectionaryKey ${s.lectionaryKey} missing readings`).toBe(true);
    }
  });

  it("Roman-rite borrowings are flagged and carry their own readings", () => {
    for (const s of TRANSFERABLE_SPECIALS.filter((x) => x.rite === "ROMAN")) {
      expect(s.readings, `${s.key} (Roman) must carry inline readings`).toBeTruthy();
      expect(s.note, `${s.key} (Roman) should note the provenance`).toBeTruthy();
    }
  });
});
