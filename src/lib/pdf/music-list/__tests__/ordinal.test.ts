import { describe, it, expect } from "vitest";
import { formatOrdinalParts, ordinalSuffix } from "../ordinal";

// ─── Test 15 ─────────────────────────────────────────────────────

describe("ordinalSuffix", () => {
  it("1 → st, 2 → nd, 3 → rd, 4 → th", () => {
    expect(ordinalSuffix(1)).toBe("st");
    expect(ordinalSuffix(2)).toBe("nd");
    expect(ordinalSuffix(3)).toBe("rd");
    expect(ordinalSuffix(4)).toBe("th");
  });

  // ─── Test 16 ──────────────────────────────────────────────────
  it("11 → th, 12 → th, 13 → th (English teen rule)", () => {
    expect(ordinalSuffix(11)).toBe("th");
    expect(ordinalSuffix(12)).toBe("th");
    expect(ordinalSuffix(13)).toBe("th");
  });

  // ─── Test 17 ──────────────────────────────────────────────────
  it("21 → st, 22 → nd, 23 → rd", () => {
    expect(ordinalSuffix(21)).toBe("st");
    expect(ordinalSuffix(22)).toBe("nd");
    expect(ordinalSuffix(23)).toBe("rd");
  });

  it("covers other common cases", () => {
    expect(ordinalSuffix(5)).toBe("th");
    expect(ordinalSuffix(10)).toBe("th");
    expect(ordinalSuffix(20)).toBe("th");
    expect(ordinalSuffix(31)).toBe("st");
  });
});

describe("formatOrdinalParts", () => {
  it("parses 2026-05-03 → Sunday 3rd May 2026", () => {
    const p = formatOrdinalParts("2026-05-03");
    expect(p.dayName).toBe("Sunday");
    expect(p.dayNum).toBe(3);
    expect(p.ordinal).toBe("rd");
    expect(p.month).toBe("May");
    expect(p.year).toBe(2026);
  });

  it("parses 2025-12-21 → Sunday 21st December 2025", () => {
    const p = formatOrdinalParts("2025-12-21");
    expect(p.dayNum).toBe(21);
    expect(p.ordinal).toBe("st");
    expect(p.month).toBe("December");
    expect(p.year).toBe(2025);
  });

  it("parses 2026-02-11 → 11th (teen rule)", () => {
    const p = formatOrdinalParts("2026-02-11");
    expect(p.dayNum).toBe(11);
    expect(p.ordinal).toBe("th");
  });
});
