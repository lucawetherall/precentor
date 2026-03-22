import { describe, it, expect, vi } from "vitest";

vi.mock("@/data/lectionary-coe.json", () => ({
  default: {
    yearMap: {
      "2001/2002": "A",
      "2002/2003": "B",
      "2003/2004": "C",
      "2023/2024": "B",
      "2024/2025": "A",
      "2025/2026": "C",
    },
  },
}));

import {
  computeEasterDate,
  computeAdventStart,
  getChurchYear,
  getLectionaryYear,
} from "@/lib/lectionary/calendar";

describe("computeEasterDate", () => {
  it.each([
    [2024, 2, 31], // March 31, 2024
    [2025, 3, 20], // April 20, 2025
    [2026, 3, 5],  // April 5, 2026
    [2027, 2, 28], // March 28, 2027
    [2000, 3, 23], // April 23, 2000
    [2019, 3, 21], // April 21, 2019
  ])("returns correct Easter date for year %i", (year, month, day) => {
    const easter = computeEasterDate(year);
    expect(easter.getFullYear()).toBe(year);
    expect(easter.getMonth()).toBe(month);
    expect(easter.getDate()).toBe(day);
  });

  it("always returns a Sunday", () => {
    for (const year of [2000, 2010, 2020, 2024, 2025, 2026, 2027, 2030]) {
      const easter = computeEasterDate(year);
      expect(easter.getDay()).toBe(0); // 0 = Sunday
    }
  });
});

describe("computeAdventStart", () => {
  it.each([
    [2024, 11, 1],  // Dec 1, 2024
    [2025, 10, 30], // Nov 30, 2025
    [2026, 10, 29], // Nov 29, 2026
    [2023, 11, 3],  // Dec 3, 2023
  ])("returns correct Advent Sunday for year %i", (year, month, day) => {
    const advent = computeAdventStart(year);
    expect(advent.getFullYear()).toBe(year);
    expect(advent.getMonth()).toBe(month);
    expect(advent.getDate()).toBe(day);
  });

  it("always returns a Sunday", () => {
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]) {
      const advent = computeAdventStart(year);
      expect(advent.getDay()).toBe(0);
    }
  });

  it("always falls between Nov 27 and Dec 3", () => {
    for (let year = 2000; year <= 2030; year++) {
      const advent = computeAdventStart(year);
      const month = advent.getMonth();
      const day = advent.getDate();

      if (month === 10) {
        // November: must be 27-30
        expect(day).toBeGreaterThanOrEqual(27);
        expect(day).toBeLessThanOrEqual(30);
      } else {
        // December: must be 1-3
        expect(month).toBe(11);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("getChurchYear", () => {
  it("returns previous start year for a date before Advent", () => {
    // Nov 1, 2025 is before Advent 2025 (Nov 30), so church year is 2024/2025
    const result = getChurchYear(new Date(2025, 10, 1));
    expect(result).toEqual({ startYear: 2024, endYear: 2025 });
  });

  it("returns current start year for a date on Advent Sunday", () => {
    // Dec 1, 2024 is Advent Sunday 2024
    const result = getChurchYear(new Date(2024, 11, 1));
    expect(result).toEqual({ startYear: 2024, endYear: 2025 });
  });

  it("returns current start year for a date after Advent Sunday", () => {
    // Dec 25, 2024 is after Advent 2024
    const result = getChurchYear(new Date(2024, 11, 25));
    expect(result).toEqual({ startYear: 2024, endYear: 2025 });
  });

  it("returns previous start year for a date in January (before next Advent)", () => {
    // Jan 15, 2025 is in the 2024/2025 church year
    const result = getChurchYear(new Date(2025, 0, 15));
    expect(result).toEqual({ startYear: 2024, endYear: 2025 });
  });

  it("returns previous start year for a summer date", () => {
    // July 4, 2025 is in the 2024/2025 church year
    const result = getChurchYear(new Date(2025, 6, 4));
    expect(result).toEqual({ startYear: 2024, endYear: 2025 });
  });

  it("handles the day before Advent correctly", () => {
    // Nov 30, 2024 is the day before Advent 2024 (Dec 1)
    const result = getChurchYear(new Date(2024, 10, 30));
    expect(result).toEqual({ startYear: 2023, endYear: 2024 });
  });
});

describe("getLectionaryYear", () => {
  it("returns A for 2024/2025 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2024, endYear: 2025 })).toBe("A");
  });

  it("returns B for 2023/2024 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2023, endYear: 2024 })).toBe("B");
  });

  it("returns C for 2025/2026 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2025, endYear: 2026 })).toBe("C");
  });

  it("returns A for 2001/2002 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2001, endYear: 2002 })).toBe("A");
  });

  it("returns B for 2002/2003 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2002, endYear: 2003 })).toBe("B");
  });

  it("returns C for 2003/2004 (from yearMap)", () => {
    expect(getLectionaryYear({ startYear: 2003, endYear: 2004 })).toBe("C");
  });

  it("falls back to computed cycle for years not in yearMap", () => {
    // 2004/2005 should be A (2004-2001=3, 3%3=0 -> A)
    expect(getLectionaryYear({ startYear: 2004, endYear: 2005 })).toBe("A");

    // 2005/2006 should be B
    expect(getLectionaryYear({ startYear: 2005, endYear: 2006 })).toBe("B");

    // 2006/2007 should be C
    expect(getLectionaryYear({ startYear: 2006, endYear: 2007 })).toBe("C");
  });

  it("the cycle repeats every 3 years", () => {
    const a1 = getLectionaryYear({ startYear: 2004, endYear: 2005 });
    const a2 = getLectionaryYear({ startYear: 2007, endYear: 2008 });
    const a3 = getLectionaryYear({ startYear: 2010, endYear: 2011 });
    expect(a1).toBe("A");
    expect(a2).toBe("A");
    expect(a3).toBe("A");
  });
});
