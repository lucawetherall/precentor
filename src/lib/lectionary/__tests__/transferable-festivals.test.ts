import { describe, it, expect } from "vitest";
import { availableSpecialsForSunday } from "../transferable-festivals";

const keys = (date: string, sundayKey: string | null, season: string | null) =>
  availableSpecialsForSunday(date, sundayKey, season).map((s) => s.key);

describe("availableSpecialsForSunday", () => {
  it("offers a Festival on the Sunday after it (John the Baptist, 24 Jun → Sun 28 Jun 2026)", () => {
    expect(keys("2026-06-28", null, "ORDINARY")).toContain("the-birth-of-john-the-baptist");
  });

  it("offers the same Festival on the Sunday before it (Sun 21 Jun 2026)", () => {
    expect(keys("2026-06-21", null, "ORDINARY")).toContain("the-birth-of-john-the-baptist");
  });

  it("offers Mary Magdalene (22 Jul) on the preceding Sunday (19 Jul 2026)", () => {
    expect(keys("2026-07-19", null, "ORDINARY")).toContain("mary-magdalene");
  });

  it("offers Michaelmas (29 Sep) on the nearby Sunday (27 Sep 2026)", () => {
    expect(keys("2026-09-27", null, "ORDINARY")).toContain("michael-and-all-angels");
  });

  it("offers nothing transferable on a Sunday far from any Festival (15 Feb 2026)", () => {
    // Candlemas (2 Feb) is 13 days away — outside the ±6 window.
    expect(keys("2026-02-15", null, "ORDINARY")).toEqual([]);
  });

  it("never displaces a Principal Feast", () => {
    expect(keys("2026-06-28", "easter-day", "EASTER")).toEqual([]);
  });

  it("never displaces a Sunday of Lent with a transferred Festival", () => {
    // The Annunciation (25 Mar) sits near Lent Sundays but must not be offered.
    expect(keys("2026-03-29", null, "LENT")).toEqual([]);
  });

  it("offers a same-Sunday alternate (Mothering Sunday) on the Fourth Sunday of Lent, despite the Lent block", () => {
    const result = keys("2026-03-15", "the-fourth-sunday-of-lent", "LENT");
    expect(result).toContain("mothering-sunday");
  });

  it("does not offer the alternate on any other Sunday", () => {
    expect(keys("2026-03-22", "the-fifth-sunday-of-lent", "LENT")).not.toContain("mothering-sunday");
  });
});
