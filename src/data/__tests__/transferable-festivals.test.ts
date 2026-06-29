import { describe, it, expect } from "vitest";
import { TRANSFERABLE_SPECIALS } from "../transferable-festivals";
import lectionaryData from "../lectionary-coe.json";

const sundays = (lectionaryData as { sundays: Record<string, { name: string; years: Record<string, { principal?: unknown[] }> }> }).sundays;

describe("TRANSFERABLE_SPECIALS data integrity", () => {
  it("every special key exists in the lectionary with all of A/B/C readings", () => {
    for (const s of TRANSFERABLE_SPECIALS) {
      const entry = sundays[s.key];
      expect(entry, `missing lectionary entry for ${s.key}`).toBeTruthy();
      for (const year of ["A", "B", "C"] as const) {
        const principal = entry.years[year]?.principal;
        expect(principal && principal.length > 0, `${s.key} missing year ${year} readings`).toBe(true);
      }
    }
  });

  it("transferred specials carry a valid fixed month/day", () => {
    for (const s of TRANSFERABLE_SPECIALS.filter((x) => x.kind === "transferred")) {
      expect(s.month, `${s.key} needs a month`).toBeGreaterThanOrEqual(1);
      expect(s.month!).toBeLessThanOrEqual(12);
      expect(s.day, `${s.key} needs a day`).toBeGreaterThanOrEqual(1);
      expect(s.day!).toBeLessThanOrEqual(31);
    }
  });

  it("alternate specials reference an existing Sunday key", () => {
    for (const s of TRANSFERABLE_SPECIALS.filter((x) => x.kind === "alternate")) {
      expect(s.appliesToSundayKey, `${s.key} needs appliesToSundayKey`).toBeTruthy();
      expect(sundays[s.appliesToSundayKey!], `unknown appliesToSundayKey ${s.appliesToSundayKey}`).toBeTruthy();
    }
  });

  it("has no duplicate keys", () => {
    const keys = TRANSFERABLE_SPECIALS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
