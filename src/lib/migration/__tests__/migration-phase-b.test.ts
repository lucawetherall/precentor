import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapServiceTypeAndChoirStatusToPresetKey, resolveDefaultTime } from "../preset-mapping";

// The pure helpers are already tested in preset-mapping.test.ts.
// This file tests the mapping table is exhaustive.

describe("preset key mapping — exhaustive coverage", () => {
  const serviceTypes = ["SUNG_EUCHARIST","CHORAL_EVENSONG","SAID_EUCHARIST","CHORAL_MATINS","FAMILY_SERVICE","COMPLINE","CUSTOM"] as const;
  const choirStatuses = ["CHOIR_REQUIRED","NO_CHOIR_NEEDED","SAID_SERVICE_ONLY","NO_SERVICE"] as const;
  const validKeys = new Set(["DEFAULT_CHORAL","ORGANIST_ONLY_EUCHARIST","SAID_EUCHARIST"]);

  it("every combination produces a valid preset key", () => {
    for (const st of serviceTypes) {
      for (const cs of choirStatuses) {
        const result = mapServiceTypeAndChoirStatusToPresetKey(st, cs);
        expect(validKeys.has(result), `${st}/${cs} => ${result}`).toBe(true);
      }
    }
  });
});

describe("resolveDefaultTime — edge cases", () => {
  it("handles a single non-null time with nulls", () => {
    expect(resolveDefaultTime([null, null, "09:30", null])).toEqual({ time: "09:30", ambiguous: false });
  });
  it("all nulls returns not-ambiguous", () => {
    expect(resolveDefaultTime([null, null])).toEqual({ time: null, ambiguous: false });
  });
});
