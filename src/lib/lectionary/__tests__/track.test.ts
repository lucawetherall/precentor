import { describe, it, expect } from "vitest";
import {
  resolveLectionaryTrack,
  filterReadingsByTrack,
  hasTrackChoice,
} from "../track";
import type { ReadingTrack } from "../types";

type R = { position: string; reference: string; track?: ReadingTrack | null };

// Proper 4 Year A Principal Service, as produced by the scraper: the OT,
// epistle and gospel are untagged (shared); only the two psalms carry a track.
const proper4A: R[] = [
  { position: "OLD_TESTAMENT", reference: "Genesis 6.9-22; 7.24; 8.14-19" },
  { position: "PSALM", reference: "Psalm 46", track: "CONTINUOUS" },
  { position: "NEW_TESTAMENT", reference: "Romans 1.16,17; 3.22b-28[29-31]" },
  { position: "GOSPEL", reference: "Matthew 7.21-29" },
  { position: "PSALM", reference: "Psalm 31.1-5,19-24", track: "RELATED" },
];

describe("resolveLectionaryTrack", () => {
  it("prefers the per-service override", () => {
    expect(resolveLectionaryTrack("RELATED", "CONTINUOUS")).toBe("RELATED");
  });
  it("falls back to the church default when no override", () => {
    expect(resolveLectionaryTrack(null, "RELATED")).toBe("RELATED");
  });
  it("falls back to CONTINUOUS when nothing is set", () => {
    expect(resolveLectionaryTrack(null, null)).toBe("CONTINUOUS");
  });
});

describe("filterReadingsByTrack — toggles only the psalm", () => {
  it("CONTINUOUS keeps the Continuous psalm and drops the Related psalm", () => {
    const out = filterReadingsByTrack(proper4A, "CONTINUOUS");
    const psalms = out.filter((r) => r.position === "PSALM");
    expect(psalms).toHaveLength(1);
    expect(psalms[0].reference).toBe("Psalm 46");
  });

  it("RELATED keeps the Related psalm and drops the Continuous psalm", () => {
    const out = filterReadingsByTrack(proper4A, "RELATED");
    const psalms = out.filter((r) => r.position === "PSALM");
    expect(psalms).toHaveLength(1);
    expect(psalms[0].reference).toBe("Psalm 31.1-5,19-24");
  });

  it("never changes the OT, epistle or gospel regardless of track", () => {
    for (const track of ["CONTINUOUS", "RELATED"] as const) {
      const out = filterReadingsByTrack(proper4A, track);
      const nonPsalm = out.filter((r) => r.position !== "PSALM").map((r) => r.reference);
      expect(nonPsalm).toEqual([
        "Genesis 6.9-22; 7.24; 8.14-19",
        "Romans 1.16,17; 3.22b-28[29-31]",
        "Matthew 7.21-29",
      ]);
    }
  });

  it("leaves a day with no track-tagged psalm unchanged (e.g. non-Ordinary)", () => {
    const advent: R[] = [
      { position: "OLD_TESTAMENT", reference: "Isaiah 2.1-5" },
      { position: "PSALM", reference: "Psalm 122" },
      { position: "GOSPEL", reference: "Matthew 24.36-44" },
    ];
    expect(filterReadingsByTrack(advent, "RELATED")).toEqual(advent);
  });
});

describe("hasTrackChoice", () => {
  it("is true when a tagged psalm is present (Ordinary Time)", () => {
    expect(hasTrackChoice(proper4A)).toBe(true);
  });
  it("is false when no reading is track-tagged", () => {
    const noTracks: R[] = [{ position: "PSALM", reference: "Psalm 122" }];
    expect(hasTrackChoice(noTracks)).toBe(false);
  });
});
