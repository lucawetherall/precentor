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

  it("returns empty array when requestedCount is 0", () => {
    expect(selectVerses(5, 0)).toEqual([]);
  });

  it("returns empty array for negative requestedCount", () => {
    expect(selectVerses(5, -1)).toEqual([]);
  });

  it("returns empty array when totalVerses is 0", () => {
    expect(selectVerses(0, 3)).toEqual([]);
  });

  it("returns [1] for totalVerses=1, requestedCount=1", () => {
    expect(selectVerses(1, 1)).toEqual([1]);
  });

  it("returns [1] for totalVerses=1, requestedCount=2 (no duplicate)", () => {
    expect(selectVerses(1, 2)).toEqual([1]);
  });

  it("returns [1, 2] for totalVerses=2, requestedCount=2", () => {
    expect(selectVerses(2, 2)).toEqual([1, 2]);
  });

  it("returns no duplicates for totalVerses=3, requestedCount=3", () => {
    const result = selectVerses(3, 3);
    expect(result).toEqual([1, 2, 3]);
    expect(new Set(result).size).toBe(result.length);
  });

  it("produces no duplicates for large totalVerses and small requestedCount", () => {
    const result = selectVerses(100, 5);
    expect(result[0]).toBe(1);
    expect(result[result.length - 1]).toBe(100);
    expect(new Set(result).size).toBe(result.length);
  });

  it("ignores empty explicit selection and falls through to algorithm", () => {
    expect(selectVerses(5, 3, [])).toEqual([1, 3, 5]);
  });

  it("ignores null explicit selection", () => {
    expect(selectVerses(5, 3, null)).toEqual([1, 3, 5]);
  });

  it("returns negative totalVerses as empty", () => {
    expect(selectVerses(-1, 3)).toEqual([]);
  });
});
