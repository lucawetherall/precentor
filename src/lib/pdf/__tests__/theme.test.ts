import { describe, it, expect } from "vitest";
import { accentColour, accentColourDocx, DEFAULT_ACCENT } from "../theme";

describe("accentColour", () => {
  it("returns hex for known uppercase colour", () => {
    expect(accentColour("GREEN")).toBe("#4A6741");
  });

  it("returns hex for lowercase colour (case-insensitive)", () => {
    expect(accentColour("green")).toBe("#4A6741");
  });

  it("returns hex for mixed-case colour", () => {
    expect(accentColour("Purple")).toBe("#5B2C6F");
  });

  it("returns default for unknown colour", () => {
    expect(accentColour("UNKNOWN")).toBe(DEFAULT_ACCENT);
  });

  it("returns override when provided", () => {
    expect(accentColour("GREEN", "#custom")).toBe("#custom");
  });

  it("ignores colour when override is provided", () => {
    expect(accentColour("UNKNOWN", "#override")).toBe("#override");
  });
});

describe("accentColourDocx", () => {
  it("returns hex without # for known colour", () => {
    expect(accentColourDocx("RED")).toBe("8B2500");
  });

  it("is case-insensitive", () => {
    expect(accentColourDocx("red")).toBe("8B2500");
  });

  it("returns default for unknown colour", () => {
    expect(accentColourDocx("UNKNOWN")).toBe("D4C5B2");
  });

  it("strips # from override", () => {
    expect(accentColourDocx("GREEN", "#FF0000")).toBe("FF0000");
  });

  it("returns override without # if already clean", () => {
    expect(accentColourDocx("GREEN", "FF0000")).toBe("FF0000");
  });
});
