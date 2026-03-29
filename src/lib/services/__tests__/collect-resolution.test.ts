import { describe, it, expect } from "vitest";
import { resolveCollectText } from "../collect-resolution";

describe("resolveCollectText", () => {
  it("returns collectOverride when it is set", () => {
    expect(
      resolveCollectText("Override text", "Collect text", "Liturgical day collect"),
    ).toBe("Override text");
  });

  it("returns collectText when collectOverride is null", () => {
    expect(
      resolveCollectText(null, "Collect text", "Liturgical day collect"),
    ).toBe("Collect text");
  });

  it("returns liturgicalDayCollect when both collectOverride and collectText are null", () => {
    expect(
      resolveCollectText(null, null, "Liturgical day collect"),
    ).toBe("Liturgical day collect");
  });

  it("returns null when all arguments are null", () => {
    expect(resolveCollectText(null, null, null)).toBeNull();
  });

  it("prefers collectOverride over collectText when both are set", () => {
    expect(
      resolveCollectText("Override", "Collect", null),
    ).toBe("Override");
  });

  it("prefers collectText over liturgicalDayCollect when collectOverride is null", () => {
    expect(
      resolveCollectText(null, "Collect", "Liturgical day collect"),
    ).toBe("Collect");
  });

  it("returns empty string override as truthy (empty string is a valid override)", () => {
    // Empty string is falsy in JS, so it falls through to collectText
    expect(resolveCollectText("", "Collect text", null)).toBe("Collect text");
  });

  it("returns whitespace-only override (truthy)", () => {
    // Whitespace is truthy
    expect(resolveCollectText("  ", "Collect text", null)).toBe("  ");
  });

  it("returns collectOverride even when other params are also set", () => {
    expect(resolveCollectText("Override", "Collect", "Day")).toBe("Override");
  });

  it("returns liturgicalDayCollect when override is empty and collectText is null", () => {
    expect(resolveCollectText("", null, "Day collect")).toBe("Day collect");
  });
});
