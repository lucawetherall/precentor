import { describe, it, expect } from "vitest";
import { mapServiceTypeAndChoirStatusToPresetKey, resolveDefaultTime } from "../preset-mapping";

describe("mapServiceTypeAndChoirStatusToPresetKey", () => {
  it.each([
    ["SUNG_EUCHARIST", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CHORAL_EVENSONG", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CHORAL_MATINS", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["COMPLINE", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["FAMILY_SERVICE", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CUSTOM", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["SAID_EUCHARIST", "CHOIR_REQUIRED", "SAID_EUCHARIST"],
    ["SUNG_EUCHARIST", "NO_CHOIR_NEEDED", "ORGANIST_ONLY_EUCHARIST"],
    ["SUNG_EUCHARIST", "SAID_SERVICE_ONLY", "SAID_EUCHARIST"],
  ] as const)("maps %s/%s to %s", (st, cs, expected) => {
    expect(mapServiceTypeAndChoirStatusToPresetKey(st, cs)).toBe(expected);
  });
});

describe("resolveDefaultTime", () => {
  it("returns the time when all inputs agree", () => {
    expect(resolveDefaultTime(["10:00", "10:00"])).toEqual({ time: "10:00", ambiguous: false });
  });
  it("returns ambiguous when times disagree", () => {
    expect(resolveDefaultTime(["10:00", "11:00"])).toEqual({ time: null, ambiguous: true });
  });
  it("returns null when no times provided", () => {
    expect(resolveDefaultTime([])).toEqual({ time: null, ambiguous: false });
  });
  it("ignores nulls", () => {
    expect(resolveDefaultTime(["10:00", null])).toEqual({ time: "10:00", ambiguous: false });
  });
});
