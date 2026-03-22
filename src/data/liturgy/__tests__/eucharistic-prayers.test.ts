import { describe, it, expect } from "vitest";
import {
  EUCHARISTIC_PRAYERS,
  EUCHARISTIC_PRAYER_A,
  EUCHARISTIC_PRAYER_B,
  EUCHARISTIC_PRAYER_C,
  EUCHARISTIC_PRAYER_D,
  EUCHARISTIC_PRAYER_E,
  EUCHARISTIC_PRAYER_F,
  EUCHARISTIC_PRAYER_G,
  EUCHARISTIC_PRAYER_H,
} from "../eucharistic-prayers";

describe("Eucharistic Prayers", () => {
  it("exports all 8 prayers (A–H)", () => {
    expect(Object.keys(EUCHARISTIC_PRAYERS)).toHaveLength(8);
    expect(EUCHARISTIC_PRAYERS).toHaveProperty("A");
    expect(EUCHARISTIC_PRAYERS).toHaveProperty("H");
  });

  it("each prayer has a unique id", () => {
    const ids = Object.values(EUCHARISTIC_PRAYERS).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each prayer has non-empty blocks", () => {
    for (const [, prayer] of Object.entries(EUCHARISTIC_PRAYERS)) {
      expect(prayer.blocks.length).toBeGreaterThan(0);
      expect(prayer.title).toContain("Eucharistic Prayer");
    }
  });

  it("each prayer contains Sursum Corda dialogue", () => {
    for (const prayer of Object.values(EUCHARISTIC_PRAYERS)) {
      const hasLiftUp = prayer.blocks.some((b) =>
        b.text.includes("Lift up your hearts")
      );
      expect(hasLiftUp).toBe(true);
    }
  });

  it("each prayer contains institution narrative", () => {
    for (const prayer of Object.values(EUCHARISTIC_PRAYERS)) {
      const hasInstitution = prayer.blocks.some((b) =>
        b.text.includes("this is my body")
      );
      expect(hasInstitution).toBe(true);
    }
  });

  it("prayers A–G contain Sanctus", () => {
    const prayersWithSanctus = ["A", "B", "C", "D", "E", "F", "G"];
    for (const key of prayersWithSanctus) {
      const prayer = EUCHARISTIC_PRAYERS[key];
      const hasSanctus = prayer.blocks.some((b) =>
        b.text.includes("Holy, holy, holy")
      );
      expect(hasSanctus).toBe(true);
    }
  });

  it("named exports match lookup map", () => {
    expect(EUCHARISTIC_PRAYERS.A).toBe(EUCHARISTIC_PRAYER_A);
    expect(EUCHARISTIC_PRAYERS.B).toBe(EUCHARISTIC_PRAYER_B);
    expect(EUCHARISTIC_PRAYERS.C).toBe(EUCHARISTIC_PRAYER_C);
    expect(EUCHARISTIC_PRAYERS.D).toBe(EUCHARISTIC_PRAYER_D);
    expect(EUCHARISTIC_PRAYERS.E).toBe(EUCHARISTIC_PRAYER_E);
    expect(EUCHARISTIC_PRAYERS.F).toBe(EUCHARISTIC_PRAYER_F);
    expect(EUCHARISTIC_PRAYERS.G).toBe(EUCHARISTIC_PRAYER_G);
    expect(EUCHARISTIC_PRAYERS.H).toBe(EUCHARISTIC_PRAYER_H);
  });

  it("all blocks have valid speaker types", () => {
    const validSpeakers = ["president", "all", "reader", "deacon", "rubric"];
    for (const prayer of Object.values(EUCHARISTIC_PRAYERS)) {
      for (const block of prayer.blocks) {
        expect(validSpeakers).toContain(block.speaker);
      }
    }
  });
});
