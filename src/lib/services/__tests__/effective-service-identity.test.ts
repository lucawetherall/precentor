import { describe, it, expect } from "vitest";
import {
  resolveEffectiveServiceIdentity,
  synthesizeSpecialReadings,
} from "../effective-service-identity";

const regularDay = {
  cwName: "The Second Sunday after Trinity",
  colour: "GREEN",
  season: "ORDINARY",
  collect: "Lord, you have taught us...",
  postCommunion: "Loving Father...",
};

describe("resolveEffectiveServiceIdentity", () => {
  it("returns the day's own identity when no special is set", () => {
    const id = resolveEffectiveServiceIdentity({ day: regularDay, specialFeastKey: null });
    expect(id).toMatchObject({
      title: regularDay.cwName,
      colour: "GREEN",
      isSpecial: false,
      specialFeastKey: null,
    });
  });

  it("swaps to the Festival's identity when a special is set", () => {
    const id = resolveEffectiveServiceIdentity({
      day: regularDay,
      specialFeastKey: "mary-magdalene",
    });
    expect(id.isSpecial).toBe(true);
    expect(id.title).toBe("Mary Magdalene");
    expect(id.colour).toBe("WHITE");
    expect(id.specialFeastKey).toBe("mary-magdalene");
  });

  it("falls back to the day for an unknown key (defensive)", () => {
    const id = resolveEffectiveServiceIdentity({ day: regularDay, specialFeastKey: "not-a-real-key" });
    expect(id.isSpecial).toBe(false);
    expect(id.title).toBe(regularDay.cwName);
  });
});

describe("synthesizeSpecialReadings", () => {
  it("returns null when there is no special", () => {
    expect(
      synthesizeSpecialReadings({ specialFeastKey: null, lectionaryYear: "A", liturgicalDayId: "d1" }),
    ).toBeNull();
  });

  it("synthesizes the Festival's readings for the given lectionary year", () => {
    const rows = synthesizeSpecialReadings({
      specialFeastKey: "the-birth-of-john-the-baptist",
      lectionaryYear: "A",
      liturgicalDayId: "d1",
    });
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThan(0);
    expect(rows!.every((r) => r.liturgicalDayId === "d1")).toBe(true);
    // The Principal Service gospel for the Birth of John the Baptist (Year A).
    const principal = rows!.filter((r) => r.lectionary === "PRINCIPAL");
    expect(principal.some((r) => r.position === "GOSPEL")).toBe(true);
  });

  it("returns null when the lectionary year is missing/invalid (falls back to regular)", () => {
    expect(
      synthesizeSpecialReadings({
        specialFeastKey: "mary-magdalene",
        lectionaryYear: null,
        liturgicalDayId: "d1",
      }),
    ).toBeNull();
  });

  it("returns null for a title-only emphasis (keeps the day's readings)", () => {
    expect(
      synthesizeSpecialReadings({ specialFeastKey: "gaudete", lectionaryYear: "A", liturgicalDayId: "d1" }),
    ).toBeNull();
  });

  it("synthesizes inline readings for a feast not in the bundled JSON (Corpus Christi)", () => {
    const rows = synthesizeSpecialReadings({
      specialFeastKey: "corpus-christi",
      lectionaryYear: "B",
      liturgicalDayId: "d1",
    });
    expect(rows).not.toBeNull();
    expect(rows!.some((r) => r.reference === "John 6.51-58")).toBe(true);
  });

  it("picks the right year for a per-year inline feast (Sacred Heart)", () => {
    const a = synthesizeSpecialReadings({ specialFeastKey: "the-most-sacred-heart-of-jesus", lectionaryYear: "A", liturgicalDayId: "d1" });
    const c = synthesizeSpecialReadings({ specialFeastKey: "the-most-sacred-heart-of-jesus", lectionaryYear: "C", liturgicalDayId: "d1" });
    expect(a!.some((r) => r.reference === "Matthew 11.25-30")).toBe(true); // Year A gospel
    expect(c!.some((r) => r.reference === "Luke 15.3-7")).toBe(true); // Year C gospel
  });

  it("reuses an existing lectionary key for a Marian feast (Nativity of the BVM)", () => {
    const rows = synthesizeSpecialReadings({
      specialFeastKey: "the-nativity-of-the-bvm",
      lectionaryYear: "A",
      liturgicalDayId: "d1",
    });
    // Common of the BVM gospel (the Magnificat), pulled from the 15 Aug entry.
    expect(rows!.some((r) => r.reference === "Luke 1.46-55")).toBe(true);
  });
});

describe("resolveEffectiveServiceIdentity — emphasis & feasts", () => {
  it("emphasis swaps the title but keeps the day's colour and collect", () => {
    const id = resolveEffectiveServiceIdentity({ day: regularDay, specialFeastKey: "gaudete" });
    expect(id.isSpecial).toBe(true);
    expect(id.title).toContain("Gaudete");
    expect(id.colour).toBe(regularDay.colour); // unchanged
    expect(id.collect).toBe(regularDay.collect); // unchanged
    expect(id.note).toBeTruthy(); // rose-vestment footnote
  });

  it("a Roman feast carries its colour, title and rite flag", () => {
    const id = resolveEffectiveServiceIdentity({ day: regularDay, specialFeastKey: "the-most-precious-blood-of-jesus" });
    expect(id.title).toBe("The Most Precious Blood of Jesus");
    expect(id.colour).toBe("RED");
    expect(id.rite).toBe("ROMAN");
  });

  it("a Marian feast takes its own name but the Common's white colour", () => {
    const id = resolveEffectiveServiceIdentity({ day: regularDay, specialFeastKey: "the-nativity-of-the-bvm" });
    expect(id.title).toBe("The Nativity of the Blessed Virgin Mary");
    expect(id.colour).toBe("WHITE");
    expect(id.rite).toBe("CW");
  });
});
