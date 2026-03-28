import { describe, it, expect } from "vitest";
import { parseBookName, classifyReading } from "../bible-books";

describe("parseBookName edge cases", () => {
  it("returns empty string for empty input", () => {
    expect(parseBookName("")).toBe("");
  });

  it("returns trimmed result for whitespace-only input", () => {
    expect(parseBookName("   ")).toBe("");
  });

  it('parses "Song of Solomon 2.1-5" correctly', () => {
    const result = parseBookName("Song of Solomon 2.1-5");
    expect(result).toMatch(/^Song of/);
  });

  it('parses "Bel and the Dragon 1.1"', () => {
    expect(parseBookName("Bel and the Dragon 1.1")).toBe("Bel and the Dragon");
  });

  it('parses "Wisdom of Solomon 1.1"', () => {
    expect(parseBookName("Wisdom of Solomon 1.1")).toBe("Wisdom of Solomon");
  });

  it('parses "Canticle: Magnificat"', () => {
    expect(parseBookName("Canticle: Magnificat")).toBe("Canticle: Magnificat");
  });

  it('parses "1 Corinthians 1.3-9"', () => {
    expect(parseBookName("1 Corinthians 1.3-9")).toBe("1 Corinthians");
  });

  it('parses "Psalm 23"', () => {
    expect(parseBookName("Psalm 23")).toBe("Psalm");
  });

  it("handles extra spaces gracefully", () => {
    const result = parseBookName("  Isaiah   2.1  ");
    expect(result.trim()).toBe("Isaiah");
  });
});

describe("classifyReading edge cases", () => {
  describe("Gospel books", () => {
    it.each([
      ["Matthew 1.1", "GOSPEL"],
      ["Mark 1.1", "GOSPEL"],
      ["Luke 1.1", "GOSPEL"],
      ["John 1.1", "GOSPEL"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("New Testament books", () => {
    it.each([
      ["Romans 1.1", "NEW_TESTAMENT"],
      ["1 Corinthians 1.1", "NEW_TESTAMENT"],
      ["Revelation 1.1", "NEW_TESTAMENT"],
      ["Acts 1.1", "NEW_TESTAMENT"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("Old Testament books", () => {
    it.each([
      ["Genesis 1.1", "OLD_TESTAMENT"],
      ["Isaiah 1.1", "OLD_TESTAMENT"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("Apocrypha books (classified as OLD_TESTAMENT)", () => {
    it.each([
      ["Baruch 1.1", "OLD_TESTAMENT"],
      ["Tobit 1.1", "OLD_TESTAMENT"],
      ["Wisdom 1.1", "OLD_TESTAMENT"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("Psalms", () => {
    it.each([
      ["Psalm 23", "PSALM"],
      ["Psalms 119.1-8", "PSALM"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("Canticles", () => {
    it.each([
      ["Canticle: Magnificat", "CANTICLE"],
      ["Magnificat", "CANTICLE"],
    ] as const)('classifies "%s" as %s', (ref, expected) => {
      expect(classifyReading(ref)).toBe(expected);
    });
  });

  describe("Numbers in book names", () => {
    it('classifies "2 Kings 1.1" as OLD_TESTAMENT', () => {
      expect(classifyReading("2 Kings 1.1")).toBe("OLD_TESTAMENT");
    });

    it('classifies "3 John 1" as NEW_TESTAMENT', () => {
      expect(classifyReading("3 John 1")).toBe("NEW_TESTAMENT");
    });
  });

  it("defaults unknown references to OLD_TESTAMENT", () => {
    expect(classifyReading("UnknownBook 1.1")).toBe("OLD_TESTAMENT");
  });
});
