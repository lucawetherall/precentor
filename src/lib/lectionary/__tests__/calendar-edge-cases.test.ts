import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/lectionary-coe.json", () => ({
  default: {
    yearMap: {
      "2024/2025": "A",
      "2025/2026": "C",
    },
    sundays: {},
  },
}));

import {
  computeEasterDate,
  computeAdventStart,
  getChurchYear,
  getLectionaryYear,
  computeLiturgicalCalendar,
} from "@/lib/lectionary/calendar";

describe("computeEasterDate edge cases", () => {
  it("returns the earliest possible Easter (March 22) for 1818 and 2285", () => {
    const easter1818 = computeEasterDate(1818);
    expect(easter1818.getMonth()).toBe(2); // March
    expect(easter1818.getDate()).toBe(22);

    const easter2285 = computeEasterDate(2285);
    expect(easter2285.getMonth()).toBe(2);
    expect(easter2285.getDate()).toBe(22);
  });

  it("returns the latest possible Easter (April 25) for 2038", () => {
    const easter2038 = computeEasterDate(2038);
    expect(easter2038.getMonth()).toBe(3); // April
    expect(easter2038.getDate()).toBe(25);
  });

  it("returns April 23 for leap year 2000, and that date is a Sunday", () => {
    const easter2000 = computeEasterDate(2000);
    expect(easter2000.getMonth()).toBe(3); // April
    expect(easter2000.getDate()).toBe(23);
    expect(easter2000.getDay()).toBe(0); // Sunday
  });

  it("always returns a Sunday for years 1900-2100", () => {
    for (let year = 1900; year <= 2100; year++) {
      const easter = computeEasterDate(year);
      expect(easter.getDay()).toBe(0);
    }
  });
});

describe("computeAdventStart edge cases", () => {
  it("returns a Sunday between Nov 27 and Dec 3 for years 1900-2100", () => {
    for (let year = 1900; year <= 2100; year++) {
      const advent = computeAdventStart(year);
      expect(advent.getDay()).toBe(0); // Sunday

      const month = advent.getMonth();
      const day = advent.getDate();

      const isInRange =
        (month === 10 && day >= 27) || // Nov 27-30
        (month === 11 && day <= 3); // Dec 1-3
      expect(isInRange).toBe(true);
    }
  });
});

describe("getChurchYear boundary", () => {
  it("returns current year as startYear on Advent Sunday itself", () => {
    const advent2024 = computeAdventStart(2024);
    const result = getChurchYear(advent2024);
    expect(result.startYear).toBe(2024);
    expect(result.endYear).toBe(2025);
  });

  it("returns previous year as startYear on the day before Advent Sunday", () => {
    const advent2024 = computeAdventStart(2024);
    const dayBefore = new Date(advent2024.getTime() - 86400000);
    const result = getChurchYear(dayBefore);
    expect(result.startYear).toBe(2023);
    expect(result.endYear).toBe(2024);
  });
});

describe("getLectionaryYear fallback", () => {
  it("returns a value from yearMap when the key exists", () => {
    expect(getLectionaryYear({ startYear: 2024, endYear: 2025 })).toBe("A");
    expect(getLectionaryYear({ startYear: 2025, endYear: 2026 })).toBe("C");
  });

  it("computes a fallback (A, B, or C) for years not in yearMap", () => {
    const result = getLectionaryYear({ startYear: 2030, endYear: 2031 });
    expect(["A", "B", "C"]).toContain(result);
  });
});

describe("computeLiturgicalCalendar", () => {
  const calendar = computeLiturgicalCalendar({ startYear: 2024, endYear: 2025 });

  it("returns entries sorted by date", () => {
    for (let i = 1; i < calendar.length; i++) {
      expect(calendar[i].date >= calendar[i - 1].date).toBe(true);
    }
  });

  it("has no duplicate dates", () => {
    const dates = calendar.map((e) => e.date);
    expect(dates.length).toBe(new Set(dates).size);
  });

  it("has valid season and colour values for every entry", () => {
    const validSeasons = new Set([
      "ADVENT",
      "CHRISTMAS",
      "EPIPHANY",
      "LENT",
      "HOLY_WEEK",
      "EASTER",
      "ASCENSION",
      "PENTECOST",
      "TRINITY",
      "ORDINARY",
      "KINGDOM",
    ]);
    const validColours = new Set(["PURPLE", "WHITE", "GOLD", "GREEN", "RED", "ROSE"]);

    for (const entry of calendar) {
      expect(validSeasons.has(entry.season)).toBe(true);
      expect(validColours.has(entry.colour)).toBe(true);
    }
  });
});
