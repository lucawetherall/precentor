import { describe, it, expect } from "vitest";
import { parseHymnList, parsePsalm, resolveServiceType } from "../cell-parsers";

describe("parseHymnList", () => {
  it("parses comma-separated numbers", () => {
    expect(parseHymnList("117, 103, 271, 295")).toEqual([
      { raw: "117", number: 117 },
      { raw: "103", number: 103 },
      { raw: "271", number: 271 },
      { raw: "295", number: 295 },
    ]);
  });
  it("parses space-separated numbers", () => {
    expect(parseHymnList("117 103 271")).toEqual([
      { raw: "117", number: 117 },
      { raw: "103", number: 103 },
      { raw: "271", number: 271 },
    ]);
  });
  it("handles mixed separators and trims whitespace", () => {
    expect(parseHymnList(" 117 , 103  271,  295 ")).toEqual([
      { raw: "117", number: 117 },
      { raw: "103", number: 103 },
      { raw: "271", number: 271 },
      { raw: "295", number: 295 },
    ]);
  });
  it("keeps non-numeric tokens as raw-only entries", () => {
    expect(parseHymnList("117, King of glory, 271")).toEqual([
      { raw: "117", number: 117 },
      { raw: "King of glory", number: null },
      { raw: "271", number: 271 },
    ]);
  });
  it("returns empty array for empty/whitespace input", () => {
    expect(parseHymnList("")).toEqual([]);
    expect(parseHymnList("   ")).toEqual([]);
  });
});

describe("parsePsalm", () => {
  it("accepts canonical psalm numbers 1-150", () => {
    expect(parsePsalm("23")).toEqual({ raw: "23", number: 23, valid: true });
    expect(parsePsalm("150")).toEqual({ raw: "150", number: 150, valid: true });
    expect(parsePsalm("1")).toEqual({ raw: "1", number: 1, valid: true });
  });
  it("flags out-of-range numbers as free text", () => {
    expect(parsePsalm("151")).toEqual({ raw: "151", number: null, valid: false });
    expect(parsePsalm("0")).toEqual({ raw: "0", number: null, valid: false });
  });
  it("keeps non-numeric input as free text", () => {
    expect(parsePsalm("23 vv 1-4")).toEqual({ raw: "23 vv 1-4", number: null, valid: false });
  });
  it("trims whitespace", () => {
    expect(parsePsalm("  23  ")).toEqual({ raw: "23", number: 23, valid: true });
  });
});

describe("resolveServiceType", () => {
  it("passes enum values through case-insensitively", () => {
    expect(resolveServiceType("SUNG_EUCHARIST")).toBe("SUNG_EUCHARIST");
    expect(resolveServiceType("sung_eucharist")).toBe("SUNG_EUCHARIST");
  });
  it("resolves human aliases", () => {
    expect(resolveServiceType("Sung Eucharist")).toBe("SUNG_EUCHARIST");
    expect(resolveServiceType("Choral Evensong")).toBe("CHORAL_EVENSONG");
    expect(resolveServiceType("Evensong")).toBe("CHORAL_EVENSONG");
    expect(resolveServiceType("Mattins")).toBe("CHORAL_MATINS");
    expect(resolveServiceType("Matins")).toBe("CHORAL_MATINS");
    expect(resolveServiceType("Said Eucharist")).toBe("SAID_EUCHARIST");
    expect(resolveServiceType("Family Service")).toBe("FAMILY_SERVICE");
  });
  it("returns null for unknown strings", () => {
    expect(resolveServiceType("Dinner")).toBeNull();
    expect(resolveServiceType("")).toBeNull();
  });
});
