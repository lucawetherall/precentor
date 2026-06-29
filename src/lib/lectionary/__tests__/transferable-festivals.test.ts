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

  it("offers nothing transferable on a Sunday far from any Festival (12 Jul 2026)", () => {
    // Sits in the 19-day gap between Thomas (3 Jul) and Mary Magdalene (22 Jul);
    // every feast is >6 days away, and no emphasis/alternate applies.
    expect(keys("2026-07-12", null, "ORDINARY")).toEqual([]);
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

  it("offers a traditional-name emphasis on its own Sunday despite the season block", () => {
    // Gaudete = Advent 3 (the season is ADVENT, which blocks transferred feasts).
    expect(keys("2026-12-13", "the-third-sunday-of-advent", "ADVENT")).toContain("gaudete");
    // Low Sunday = Easter 2 (EASTER is likewise a blocked season for transfers).
    expect(keys("2026-04-12", "the-second-sunday-of-easter", "EASTER")).toContain("low-sunday");
  });

  it("offers a movable feast (Corpus Christi) on Trinity 1, not on Trinity Sunday", () => {
    // Easter 2026 = 5 Apr → Corpus Christi (Easter+60) = Thu 4 Jun; Trinity 1 = Sun 7 Jun.
    expect(keys("2026-06-07", null, "ORDINARY")).toContain("corpus-christi");
    // Trinity Sunday (31 May) is within the window but is a Principal Feast → excluded.
    expect(keys("2026-05-31", "trinity-sunday", "TRINITY")).not.toContain("corpus-christi");
  });

  it("offers the Sacred Heart (Roman) near its movable date with a Roman-rite flag", () => {
    // Sacred Heart = Easter+68 = Fri 12 Jun 2026; offered on Trinity 2 (14 Jun).
    const result = availableSpecialsForSunday("2026-06-14", null, "ORDINARY");
    const sacredHeart = result.find((s) => s.key === "the-most-sacred-heart-of-jesus");
    expect(sacredHeart).toBeTruthy();
    expect(sacredHeart?.rite).toBe("ROMAN");
  });
});
