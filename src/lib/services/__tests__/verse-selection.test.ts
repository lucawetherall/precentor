import { describe, it, expect } from "vitest";
import { selectVerses } from "../verse-selection";

describe("selectVerses", () => {
  it("returns all verses when count >= total", () => {
    expect(selectVerses(4, 4)).toEqual([1, 2, 3, 4]);
  });

  it("returns all verses when count > total", () => {
    expect(selectVerses(3, 5)).toEqual([1, 2, 3]);
  });

  it("preserves first and last, evenly spaces middle (7 total, 4 requested)", () => {
    expect(selectVerses(7, 4)).toEqual([1, 3, 5, 7]);
  });

  it("preserves first and last only (8 total, 2 requested)", () => {
    expect(selectVerses(8, 2)).toEqual([1, 8]);
  });

  it("handles 6 total, 3 requested", () => {
    expect(selectVerses(6, 3)).toEqual([1, 3, 6]);
  });

  it("returns [1] when count is 1", () => {
    expect(selectVerses(5, 1)).toEqual([1]);
  });

  it("respects explicit selected_verses override", () => {
    expect(selectVerses(7, 4, [1, 2, 5, 7])).toEqual([1, 2, 5, 7]);
  });
});
