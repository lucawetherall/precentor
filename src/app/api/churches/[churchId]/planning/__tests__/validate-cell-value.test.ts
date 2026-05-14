import { describe, it, expect } from "vitest";
import { validateCellValue, MAX_CELL_TEXT_LEN } from "../_write-cell";

describe("validateCellValue", () => {
  it("accepts an empty object", () => {
    expect(validateCellValue({})).toBeNull();
  });

  it("accepts null text and null refId", () => {
    expect(validateCellValue({ text: null, refId: null })).toBeNull();
  });

  it("accepts text up to the max length", () => {
    expect(validateCellValue({ text: "x".repeat(MAX_CELL_TEXT_LEN) })).toBeNull();
  });

  it("rejects text over the max length", () => {
    const err = validateCellValue({ text: "x".repeat(MAX_CELL_TEXT_LEN + 1) });
    expect(err).toContain("characters");
  });

  it("rejects non-string text", () => {
    expect(validateCellValue({ text: 123 })).toContain("string");
  });

  it("accepts a valid UUID refId", () => {
    expect(validateCellValue({ refId: "550e8400-e29b-41d4-a716-446655440000" })).toBeNull();
  });

  it("rejects a non-UUID refId", () => {
    expect(validateCellValue({ refId: "not-a-uuid" })).toContain("UUID");
  });

  it("rejects a non-object value", () => {
    expect(validateCellValue(null)).toContain("object");
    expect(validateCellValue("oops")).toContain("object");
  });
});
