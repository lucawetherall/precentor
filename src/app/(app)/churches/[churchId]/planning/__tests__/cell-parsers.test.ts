import { describe, it, expect } from "vitest";
import { parseHymnList } from "../cell-parsers";

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
