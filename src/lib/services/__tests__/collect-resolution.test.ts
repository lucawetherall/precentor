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
});
