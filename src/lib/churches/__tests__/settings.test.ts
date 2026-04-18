import { describe, it, expect } from "vitest";
import { readSheetMusicLink, writeSheetMusicLink } from "../settings";

describe("readSheetMusicLink", () => {
  it("returns null for null settings", () => {
    expect(readSheetMusicLink(null)).toBeNull();
  });

  it("returns null for undefined settings", () => {
    expect(readSheetMusicLink(undefined)).toBeNull();
  });

  it("returns null for empty settings", () => {
    expect(readSheetMusicLink({})).toBeNull();
  });

  it("returns null when sheetMusicLink is not an object", () => {
    expect(readSheetMusicLink({ sheetMusicLink: "https://example.com" })).toBeNull();
  });

  it("returns null when url is missing", () => {
    expect(readSheetMusicLink({ sheetMusicLink: { label: "x" } })).toBeNull();
  });

  it("returns the link when valid with url only", () => {
    expect(readSheetMusicLink({ sheetMusicLink: { url: "https://example.com" } })).toEqual({
      url: "https://example.com",
    });
  });

  it("returns the link with trimmed label", () => {
    expect(
      readSheetMusicLink({
        sheetMusicLink: { url: "https://example.com", label: "  Choir  " },
      }),
    ).toEqual({ url: "https://example.com", label: "Choir" });
  });

  it("omits empty/whitespace labels", () => {
    expect(
      readSheetMusicLink({ sheetMusicLink: { url: "https://example.com", label: "   " } }),
    ).toEqual({ url: "https://example.com" });
  });
});

describe("writeSheetMusicLink", () => {
  it("sets the link on empty settings", () => {
    expect(writeSheetMusicLink({}, { url: "https://example.com" })).toEqual({
      sheetMusicLink: { url: "https://example.com" },
    });
  });

  it("preserves unrelated keys", () => {
    const existing = { other: 42, nested: { a: 1 } };
    const result = writeSheetMusicLink(existing, { url: "https://example.com" });
    expect(result).toEqual({
      other: 42,
      nested: { a: 1 },
      sheetMusicLink: { url: "https://example.com" },
    });
    // Input must not be mutated.
    expect(existing).toEqual({ other: 42, nested: { a: 1 } });
  });

  it("overwrites an existing link", () => {
    const existing = { sheetMusicLink: { url: "https://old.com", label: "Old" } };
    const result = writeSheetMusicLink(existing, {
      url: "https://new.com",
      label: "New",
    });
    expect(result).toEqual({
      sheetMusicLink: { url: "https://new.com", label: "New" },
    });
  });

  it("removes the key when value is null", () => {
    const existing = {
      other: 1,
      sheetMusicLink: { url: "https://example.com" },
    };
    expect(writeSheetMusicLink(existing, null)).toEqual({ other: 1 });
  });

  it("is a no-op when clearing a link that wasn't set", () => {
    expect(writeSheetMusicLink({ other: 1 }, null)).toEqual({ other: 1 });
  });

  it("trims the label", () => {
    expect(
      writeSheetMusicLink({}, { url: "https://example.com", label: "  Choir  " }),
    ).toEqual({ sheetMusicLink: { url: "https://example.com", label: "Choir" } });
  });

  it("omits empty labels", () => {
    expect(writeSheetMusicLink({}, { url: "https://example.com", label: "" })).toEqual({
      sheetMusicLink: { url: "https://example.com" },
    });
  });

  it("treats null settings input as empty", () => {
    expect(writeSheetMusicLink(null, { url: "https://example.com" })).toEqual({
      sheetMusicLink: { url: "https://example.com" },
    });
  });
});
