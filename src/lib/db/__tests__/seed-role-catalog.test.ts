import { describe, it, expect } from "vitest";
import { ROLE_CATALOG_SEED } from "../seed-role-catalog";

describe("ROLE_CATALOG_SEED", () => {
  it("includes the 39 expected catalog rows", () => {
    expect(ROLE_CATALOG_SEED).toHaveLength(39);
  });

  it("has unique keys across all rows", () => {
    const keys = ROLE_CATALOG_SEED.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every row has rotaEligible or institutional true", () => {
    for (const r of ROLE_CATALOG_SEED) {
      expect(r.rotaEligible || r.institutional).toBe(true);
    }
  });

  it("voice parts are rota-eligible with exclusive=false", () => {
    const voices = ROLE_CATALOG_SEED.filter((r) => r.category === "VOICE");
    expect(voices).toHaveLength(4);
    for (const v of voices) {
      expect(v.rotaEligible).toBe(true);
      expect(v.defaultExclusive).toBe(false);
    }
  });

  it("Director has rotaEligible=true", () => {
    const director = ROLE_CATALOG_SEED.find((r) => r.key === "DIRECTOR");
    expect(director?.rotaEligible).toBe(true);
  });

  it("Director of Music is institutional-only", () => {
    const dom = ROLE_CATALOG_SEED.find((r) => r.key === "DIRECTOR_OF_MUSIC");
    expect(dom?.institutional).toBe(true);
    expect(dom?.rotaEligible).toBe(false);
  });
});
