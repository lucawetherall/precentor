import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/lectionary-coe.json", () => ({
  default: {
    yearMap: { "2025/2026": "C" },
    sundays: {
      "the-first-sunday-of-advent": {
        name: "The First Sunday of Advent",
        section: "Advent",
        colour: "PURPLE",
        season: "ADVENT",
        years: {
          C: {
            principal: [
              { reference: "Jeremiah 33.14-16", position: "OLD_TESTAMENT" },
              { reference: "Psalm 25.1-9", position: "PSALM" },
              { reference: "1 Thessalonians 3.9-13", position: "EPISTLE" },
              { reference: "Luke 21.25-36", position: "GOSPEL" },
            ],
            second: [],
            third: [],
          },
        },
      },
    },
  },
}));

vi.mock("@/data/lectionary-readings-text.json", () => ({
  default: {
    "Jeremiah 33.14-16": "The days are surely coming, says the Lord...",
    "Psalm 25.1-9": "To you, O Lord, I lift up my soul...",
    "1 Thessalonians 3.9-13": "How can we thank God enough for you...",
    "Luke 21.25-36": "There will be signs in the sun, the moon...",
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { buildReadingRows } from "@/lib/lectionary/mapper";

describe("buildReadingRows", () => {
  it("builds rows with reading text from bundled JSON", () => {
    const yearReadings = {
      principal: [
        { reference: "Jeremiah 33.14-16", position: "OLD_TESTAMENT" as const },
        { reference: "Luke 21.25-36", position: "GOSPEL" as const },
      ],
      second: [],
      third: [],
    };

    const rows = buildReadingRows(yearReadings, "day-uuid-123");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      liturgicalDayId: "day-uuid-123",
      lectionary: "PRINCIPAL",
      position: "OLD_TESTAMENT",
      reference: "Jeremiah 33.14-16",
      readingText: "The days are surely coming, says the Lord...",
      bibleVersion: "NRSVAE",
    });
    expect(rows[1]).toMatchObject({
      lectionary: "PRINCIPAL",
      position: "GOSPEL",
      reference: "Luke 21.25-36",
      readingText: "There will be signs in the sun, the moon...",
      bibleVersion: "NRSVAE",
    });
  });

  it("sets readingText to null when reference not in bundled JSON", () => {
    const yearReadings = {
      principal: [
        { reference: "Unknown 1.1", position: "OLD_TESTAMENT" as const },
      ],
      second: [],
      third: [],
    };

    const rows = buildReadingRows(yearReadings, "day-uuid-123");
    expect(rows[0].readingText).toBeNull();
    expect(rows[0].bibleVersion).toBeNull();
  });

  it("skips readings with invalid positions", () => {
    const yearReadings = {
      principal: [
        { reference: "Test 1.1", position: "INVALID" as any },
      ],
      second: [],
      third: [],
    };

    const rows = buildReadingRows(yearReadings, "day-uuid-123");
    expect(rows).toHaveLength(0);
  });
});
