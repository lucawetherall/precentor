import { describe, it, expect } from "vitest";
import { isQualifyingDay, PRINCIPAL_FEAST_KEYS } from "../principal-feasts";

describe("isQualifyingDay", () => {
  it("returns true for any Sunday regardless of metadata", () => {
    // 2026-04-26 is a Sunday
    expect(isQualifyingDay("2026-04-26", null, null)).toBe(true);
  });

  it("returns false for a plain weekday with no metadata", () => {
    // 2026-04-28 is a Tuesday
    expect(isQualifyingDay("2026-04-28", null, null)).toBe(false);
  });

  it("returns true when the section is Festivals (weekday)", () => {
    // 2026-04-28 (Tue) classified as Festival
    expect(isQualifyingDay("2026-04-28", "some-festival", "Festivals")).toBe(true);
  });

  it("returns true when the sundayKey is a Principal Feast (weekday)", () => {
    // 2026-12-25 (Fri) Christmas Day
    expect(isQualifyingDay("2026-12-25", "christmas-day", "Christmas")).toBe(true);
  });

  it("PRINCIPAL_FEAST_KEYS includes the seven CofE Principal Feasts", () => {
    expect(PRINCIPAL_FEAST_KEYS.has("christmas-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("easter-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("ascension-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("day-of-pentecost-whit-sunday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("trinity-sunday")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("all-saints-day")).toBe(true);
    expect(PRINCIPAL_FEAST_KEYS.has("the-epiphany")).toBe(true);
  });

  it("does not include Principal Holy Days (Ash Wed / Maundy Thu / Good Fri)", () => {
    // These are a separate CofE liturgical category — the user's brief
    // covered Sundays + Principal Feasts + Festivals only. SUNG_EUCHARIST
    // is also the wrong default for Good Friday and Ash Wednesday.
    expect(PRINCIPAL_FEAST_KEYS.has("ash-wednesday")).toBe(false);
    expect(PRINCIPAL_FEAST_KEYS.has("maundy-thursday")).toBe(false);
    expect(PRINCIPAL_FEAST_KEYS.has("good-friday")).toBe(false);
  });
});
