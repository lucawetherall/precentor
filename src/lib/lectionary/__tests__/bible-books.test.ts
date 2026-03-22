import { describe, it, expect } from "vitest";
import {
  parseBookName,
  classifyReading,
} from "@/lib/lectionary/bible-books";


describe("parseBookName", () => {
  it.each([
    ["1 Corinthians 1.3-9", "1 Corinthians"],
    ["Isaiah 2.1-5", "Isaiah"],
    ["Psalm 122", "Psalm"],
    ["Song of Solomon 2.1-7", "Song of Solomon"],
    ["Bel and the Dragon 1-22", "Bel and the Dragon"],
    ["Wisdom of Solomon 1.1-5", "Wisdom of Solomon"],
    ["Canticle: Magnificat", "Canticle: Magnificat"],
  ])("parses \"%s\" as \"%s\"", (reference, expected) => {
    expect(parseBookName(reference)).toBe(expected);
  });

  it("handles numbered book prefixes", () => {
    expect(parseBookName("2 Kings 5.1-14")).toBe("2 Kings");
    expect(parseBookName("1 Samuel 3.1-10")).toBe("1 Samuel");
    expect(parseBookName("2 Maccabees 7.1-2")).toBe("2 Maccabees");
  });

  it("handles simple book names with chapter only", () => {
    expect(parseBookName("Genesis 1")).toBe("Genesis");
    expect(parseBookName("Romans 8")).toBe("Romans");
  });

  it("handles leading/trailing whitespace", () => {
    expect(parseBookName("  Isaiah 2.1-5  ")).toBe("Isaiah");
  });

  it("handles Song of Songs variant", () => {
    expect(parseBookName("Song of Songs 2.1-7")).toBe("Song of Songs");
  });
});

describe("classifyReading", () => {
  describe("OLD_TESTAMENT readings", () => {
    it.each([
      "Genesis 1.1-5",
      "1 Kings 19.1-8",
      "2 Maccabees 7.1-2",
      "Baruch 3.9-15",
      "Isaiah 40.1-11",
      "Ezekiel 37.1-14",
      "Daniel 7.1-14",
      "Malachi 3.1-5",
    ])("classifies \"%s\" as OLD_TESTAMENT", (reference) => {
      expect(classifyReading(reference)).toBe("OLD_TESTAMENT");
    });
  });

  describe("PSALM readings", () => {
    it("classifies \"Psalm 23\" as PSALM", () => {
      expect(classifyReading("Psalm 23")).toBe("PSALM");
    });

    it("classifies \"Psalm 119.1-8\" as PSALM", () => {
      expect(classifyReading("Psalm 119.1-8")).toBe("PSALM");
    });
  });

  describe("EPISTLE readings", () => {
    it.each([
      "Romans 8.1-11",
      "Acts 2.1-11",
      "Revelation 21.1-6",
      "1 Corinthians 13.1-13",
      "Hebrews 11.1-3",
      "James 1.1-12",
      "Philippians 2.1-11",
    ])("classifies \"%s\" as EPISTLE", (reference) => {
      expect(classifyReading(reference)).toBe("EPISTLE");
    });
  });

  describe("GOSPEL readings", () => {
    it.each([
      "John 3.16-21",
      "Matthew 5.1-12",
      "Mark 1.1-8",
      "Luke 2.1-20",
    ])("classifies \"%s\" as GOSPEL", (reference) => {
      expect(classifyReading(reference)).toBe("GOSPEL");
    });
  });

  describe("CANTICLE readings", () => {
    it("classifies \"Canticle: Magnificat\" as CANTICLE", () => {
      expect(classifyReading("Canticle: Magnificat")).toBe("CANTICLE");
    });

    it("classifies other canticle prefixed references as CANTICLE", () => {
      expect(classifyReading("Canticle: Benedictus")).toBe("CANTICLE");
      expect(classifyReading("Canticle: Nunc Dimittis")).toBe("CANTICLE");
    });
  });

  describe("edge cases", () => {
    it("handles whitespace in references", () => {
      expect(classifyReading("  John 3.16  ")).toBe("GOSPEL");
    });

    it("classifies deuterocanonical books as OLD_TESTAMENT", () => {
      expect(classifyReading("Wisdom of Solomon 7.26-8.1")).toBe("OLD_TESTAMENT");
      expect(classifyReading("Bel and the Dragon 1-22")).toBe("OLD_TESTAMENT");
      expect(classifyReading("Tobit 4.5-11")).toBe("OLD_TESTAMENT");
    });
  });
});
