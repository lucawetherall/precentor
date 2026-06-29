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
});
