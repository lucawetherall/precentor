import { describe, it, expect } from "vitest";
import { formatPeriodSubtitle } from "../period-subtitle";

describe("formatPeriodSubtitle", () => {
  // ─── Test 18 ──────────────────────────────────────────────────
  it("same month → 'May 2026'", () => {
    expect(formatPeriodSubtitle("2026-05-01", "2026-05-31")).toBe("May 2026");
  });

  // ─── Test 19 ──────────────────────────────────────────────────
  it("same year spanning 2 months → 'May & June 2026'", () => {
    expect(formatPeriodSubtitle("2026-05-01", "2026-06-30")).toBe(
      "May & June 2026",
    );
  });

  // ─── Test 20 ──────────────────────────────────────────────────
  it("cross year → 'December 2025 & January 2026'", () => {
    expect(formatPeriodSubtitle("2025-12-01", "2026-01-31")).toBe(
      "December 2025 & January 2026",
    );
  });

  it("same year spanning > 2 months uses en-dash", () => {
    expect(formatPeriodSubtitle("2026-05-01", "2026-08-31")).toBe(
      "May \u2013 August 2026",
    );
  });

  it("cross year spanning > 2 months uses en-dash", () => {
    expect(formatPeriodSubtitle("2025-12-01", "2026-02-28")).toBe(
      "December 2025 \u2013 February 2026",
    );
  });
});
