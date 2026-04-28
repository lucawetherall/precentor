import { describe, it, expect } from "vitest";
import { computeGhostRows } from "../ghost-rows";

describe("computeGhostRows", () => {
  const patterns = [
    { id: "p1", dayOfWeek: 0, serviceType: "SUNG_EUCHARIST" as const, time: "10:00", enabled: true },
    { id: "p2", dayOfWeek: 0, serviceType: "CHORAL_EVENSONG" as const, time: "18:00", enabled: true },
    { id: "p3", dayOfWeek: 3, serviceType: "CHORAL_EVENSONG" as const, time: "17:30", enabled: false },
  ];

  it("produces one ghost per (date, enabled pattern) in range, skipping existing services", () => {
    const existingServices = [
      { date: "2026-04-19", serviceType: "SUNG_EUCHARIST" as const },
    ];
    const ghosts = computeGhostRows({
      from: "2026-04-19",
      to: "2026-04-26",
      patterns,
      existingServices,
    });
    expect(ghosts).toHaveLength(3);
    expect(ghosts.find((g) => g.date === "2026-04-19" && g.serviceType === "SUNG_EUCHARIST")).toBeUndefined();
    expect(ghosts.find((g) => g.date === "2026-04-19" && g.serviceType === "CHORAL_EVENSONG")).toBeDefined();
    expect(ghosts.find((g) => g.date === "2026-04-26" && g.serviceType === "SUNG_EUCHARIST")).toBeDefined();
    expect(ghosts.find((g) => g.date === "2026-04-26" && g.serviceType === "CHORAL_EVENSONG")).toBeDefined();
  });

  it("skips disabled patterns", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-22", // Wed
      to: "2026-04-22",
      patterns,
      existingServices: [],
    });
    expect(ghosts).toHaveLength(0);
  });

  it("assigns deterministic ghost ids", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-19",
      to: "2026-04-19",
      patterns,
      existingServices: [],
    });
    expect(ghosts[0].ghostId).toBe("ghost:2026-04-19:SUNG_EUCHARIST");
  });

  it("emits a SUNG_EUCHARIST fallback for a Sunday with no patterns", () => {
    // 2026-04-26 is a Sunday
    const ghosts = computeGhostRows({
      from: "2026-04-26",
      to: "2026-04-26",
      patterns: [],
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toEqual({
      ghostId: "ghost:2026-04-26:SUNG_EUCHARIST",
      date: "2026-04-26",
      serviceType: "SUNG_EUCHARIST",
      time: null,
    });
  });

  it("does not emit a fallback when an enabled pattern already covers the day", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-26", // Sun
      to: "2026-04-26",
      patterns,
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    // The two Sunday patterns produce two ghosts; no fallback.
    expect(ghosts).toHaveLength(2);
    const types = ghosts.map((g) => g.serviceType).sort();
    expect(types).toEqual(["CHORAL_EVENSONG", "SUNG_EUCHARIST"]);
  });

  it("emits a fallback when only a non-matching pattern exists for the weekday", () => {
    const onlyWedPatterns = [
      { id: "p", dayOfWeek: 3, serviceType: "CHORAL_EVENSONG" as const, time: "17:30", enabled: true },
    ];
    const ghosts = computeGhostRows({
      from: "2026-04-26", // Sun
      to: "2026-04-26",
      patterns: onlyWedPatterns,
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].serviceType).toBe("SUNG_EUCHARIST");
  });

  it("emits a fallback for a weekday Principal Feast with no matching pattern", () => {
    const ghosts = computeGhostRows({
      from: "2026-12-25", // Fri Christmas Day
      to: "2026-12-25",
      patterns: [], // no Friday patterns
      existingServices: [],
      qualifyingDays: [{ date: "2026-12-25", sundayKey: "christmas-day", section: "Christmas" }],
    });
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].serviceType).toBe("SUNG_EUCHARIST");
  });

  it("does not emit a fallback when an existing service already covers the qualifying day with SUNG_EUCHARIST", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-26",
      to: "2026-04-26",
      patterns: [],
      existingServices: [{ date: "2026-04-26", serviceType: "SUNG_EUCHARIST" }],
      qualifyingDays: [{ date: "2026-04-26", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(0);
  });

  it("does not emit a fallback for a non-qualifying weekday", () => {
    const ghosts = computeGhostRows({
      from: "2026-04-28", // Tue, not Festival, not Principal Feast
      to: "2026-04-28",
      patterns: [],
      existingServices: [],
      qualifyingDays: [{ date: "2026-04-28", sundayKey: null, section: null }],
    });
    expect(ghosts).toHaveLength(0);
  });
});
