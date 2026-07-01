import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  churchServicePatterns: { churchId: {}, dayOfWeek: {}, enabled: {}, presetId: {} },
  churchServicePresets: { id: {}, churchId: {}, serviceType: {}, defaultTime: {} },
  services: { id: {}, churchId: {}, liturgicalDayId: {}, serviceType: {} },
  liturgicalDays: { id: {}, season: {}, date: {} },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), inArray: vi.fn() }));
vi.mock("@/lib/services/auto-generate", () => ({ snapshotPresetOntoServices: vi.fn() }));

// Each awaited query pops the next result off the queue, in call order.
const { state } = vi.hoisted(() => ({ state: { queue: [] as unknown[][] } }));
vi.mock("@/lib/db", () => {
  const next = () => state.queue.shift() ?? [];
  const chain: Record<string, unknown> = {};
  const methods = ["from", "where", "innerJoin", "limit", "values", "onConflictDoNothing", "returning"];
  for (const m of methods) chain[m] = () => chain;
  (chain as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(next()).then(res, rej);
  return { db: { select: () => chain, insert: () => chain } };
});

import { ensureQualifyingServices } from "../ensure-qualifying-services";
import { snapshotPresetOntoServices } from "@/lib/services/auto-generate";
import { logger } from "@/lib/logger";

beforeEach(() => {
  vi.clearAllMocks();
  state.queue = [];
});

describe("ensureQualifyingServices", () => {
  it("creates a service for each dayless day and snapshots its preset", async () => {
    state.queue = [
      // loadDays
      [{ id: "d1", season: "ORDINARY" }, { id: "d2", season: "LENT" }],
      // existing services (d1 already covered)
      [{ liturgicalDayId: "d1" }],
      // resolveFallbackPreset → Sunday pattern preset
      [{ id: "p1", serviceType: "SUNG_EUCHARIST", defaultTime: "10:00" }],
      // insert ... returning
      [{ id: "s2", liturgicalDayId: "d2", serviceType: "SUNG_EUCHARIST", presetId: "p1" }],
    ];

    const result = await ensureQualifyingServices("c1", "2026-01-01", "2026-12-31");

    expect(result).toEqual({ created: 1 });
    expect(snapshotPresetOntoServices).toHaveBeenCalledTimes(1);
    const [churchId, inserted] = vi.mocked(snapshotPresetOntoServices).mock.calls[0];
    expect(churchId).toBe("c1");
    expect(inserted).toHaveLength(1);
  });

  it("is idempotent — inserts nothing when every day already has a service", async () => {
    state.queue = [
      [{ id: "d1", season: "ORDINARY" }],
      [{ liturgicalDayId: "d1" }],
    ];

    const result = await ensureQualifyingServices("c1", "2026-01-01", "2026-12-31");

    expect(result).toEqual({ created: 0 });
    expect(snapshotPresetOntoServices).not.toHaveBeenCalled();
  });

  it("skips (never bare-inserts) when the church has no preset", async () => {
    state.queue = [
      [{ id: "d1", season: "ORDINARY" }],
      [], // no existing services
      [], // no Sunday pattern preset
      [], // no presets at all
    ];

    const result = await ensureQualifyingServices("c1", "2026-01-01", "2026-12-31");

    expect(result).toEqual({ created: 0 });
    expect(snapshotPresetOntoServices).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns early when there are no liturgical days in range", async () => {
    state.queue = [[]];
    const result = await ensureQualifyingServices("c1", "2026-01-01", "2026-12-31");
    expect(result).toEqual({ created: 0 });
  });
});
