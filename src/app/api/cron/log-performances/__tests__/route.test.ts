import { describe, it, expect, vi, beforeEach } from "vitest";

const { state } = vi.hoisted(() => ({
  state: { secret: "topsecret", throwSecret: false, slots: [] as unknown[], insert: vi.fn() },
}));

vi.mock("@/lib/env", () => ({
  env: new Proxy({}, {
    get(_t, p) {
      if (p === "CRON_SECRET") {
        if (state.throwSecret) throw new Error("CRON_SECRET unset");
        return state.secret;
      }
      return undefined;
    },
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ services: {}, musicSlots: {}, performanceLogs: {}, liturgicalDays: {} }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), lt: vi.fn(), or: vi.fn(), isNotNull: vi.fn(), sql: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "leftJoin"]) chain[m] = () => chain;
  chain.where = () => Promise.resolve(state.slots);
  return { db: { select: () => chain, insert: () => ({ values: state.insert }) } };
});

import { GET } from "../route";

function req(token?: string) {
  return new Request("http://x/api/cron/log-performances", {
    headers: token ? { authorization: token } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.secret = "topsecret";
  state.throwSecret = false;
  state.slots = [];
  state.insert.mockResolvedValue(undefined);
});

describe("GET /api/cron/log-performances", () => {
  it("returns 500 when CRON_SECRET access throws", async () => {
    state.throwSecret = true;
    expect((await GET(req("Bearer topsecret"))).status).toBe(500);
  });

  it("returns 500 when CRON_SECRET is empty", async () => {
    state.secret = "";
    expect((await GET(req("Bearer "))).status).toBe(500);
  });

  it("returns 401 when the bearer token is missing", async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 401 when the bearer token is wrong", async () => {
    expect((await GET(req("Bearer wrongsecr"))).status).toBe(401);
  });

  it("logs nothing and reports 0 when there are no unlogged slots", async () => {
    const res = await GET(req("Bearer topsecret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, logged: 0 });
    expect(state.insert).not.toHaveBeenCalled();
  });

  it("inserts performance logs for unlogged slots and reports the count", async () => {
    state.slots = [
      { slotId: "sl1", churchId: "c1", date: "2026-01-01", hymnId: "h1", anthemId: null, freeText: null },
      { slotId: "sl2", churchId: "c1", date: "2026-01-08", hymnId: null, anthemId: null, freeText: "Voluntary" },
    ];
    const res = await GET(req("Bearer topsecret"));
    expect(await res.json()).toEqual({ success: true, logged: 2 });
    expect(state.insert).toHaveBeenCalledOnce();
  });

  it("returns 500 when the logging query throws", async () => {
    state.insert.mockRejectedValue(new Error("db down"));
    state.slots = [{ slotId: "sl1", churchId: "c1", date: "2026-01-01", hymnId: "h1", anthemId: null, freeText: null }];
    expect((await GET(req("Bearer topsecret"))).status).toBe(500);
  });
});
