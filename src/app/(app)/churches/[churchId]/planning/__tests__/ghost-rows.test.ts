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
});
