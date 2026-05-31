import { describe, it, expect } from "vitest";
import { isRealCalendarDate } from "../dates";

describe("isRealCalendarDate", () => {
  it("accepts real dates", () => {
    expect(isRealCalendarDate("2024-02-29")).toBe(true); // leap year
    expect(isRealCalendarDate("2025-01-01")).toBe(true);
    expect(isRealCalendarDate("2025-12-31")).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    expect(isRealCalendarDate("2024-02-30")).toBe(false);
    expect(isRealCalendarDate("2023-02-29")).toBe(false); // non-leap year
    expect(isRealCalendarDate("2024-13-01")).toBe(false);
    expect(isRealCalendarDate("2024-00-10")).toBe(false);
    expect(isRealCalendarDate("2024-04-31")).toBe(false);
    expect(isRealCalendarDate("2024-01-00")).toBe(false);
  });
});
