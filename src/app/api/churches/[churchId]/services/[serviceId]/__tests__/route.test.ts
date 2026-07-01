import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/validation/schemas", () => ({ serviceUpdateSchema: {} }));
vi.mock("@/lib/db/schema", () => ({
  services: { id: {}, churchId: {}, liturgicalDayId: {}, sheetMode: {}, eucharisticPrayer: {}, includeReadingText: {}, liturgicalOverrides: {}, specialFeastKey: {} },
  collects: { id: {}, churchId: {} },
  liturgicalDays: { id: {}, date: {}, icalUid: {}, season: {} },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), or: vi.fn(), isNull: vi.fn() }));

const { state } = vi.hoisted(() => ({ state: { rows: [] as unknown[], dayRows: null as unknown[] | null, throw: false } }));
vi.mock("@/lib/db", () => {
  const terminal = () => (state.throw ? Promise.reject(new Error("db down")) : Promise.resolve(state.rows));
  // The special-feast validation select joins liturgical_days; when state.dayRows
  // is set, the `.limit`-terminated select resolves to it instead of state.rows.
  const dayTerminal = () => Promise.resolve(state.dayRows ?? state.rows);
  const selectChain: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin"]) selectChain[m] = () => selectChain;
  selectChain.limit = () => (state.dayRows ? dayTerminal() : terminal());
  const writeChain: Record<string, unknown> = {};
  for (const m of ["set", "where"]) writeChain[m] = () => writeChain;
  writeChain.returning = terminal;
  return { db: { select: () => selectChain, update: () => writeChain, delete: () => writeChain } };
});

import { GET, PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.dayRows = null;
  state.throw = false;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { sheetMode: "BOOKLET" }, error: null } as never);
});

describe("GET /api/churches/[churchId]/services/[serviceId]", () => {
  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });

  it("returns 404 when the service is missing", async () => {
    state.rows = [];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns the service settings", async () => {
    state.rows = [{ id: "s1", sheetMode: "BOOKLET" }];
    expect(await (await GET(new Request("http://x"), ctx)).json()).toEqual({ id: "s1", sheetMode: "BOOKLET" });
  });

  it("returns 500 on a query error", async () => {
    state.throw = true;
    expect((await GET(new Request("http://x"), ctx)).status).toBe(500);
  });
});

describe("PATCH /api/churches/[churchId]/services/[serviceId]", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(400);
  });

  it("returns 400 when no recognised fields are present", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { bogus: 1 }, error: null } as never);
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(400);
  });

  it("returns 404 when the service is missing", async () => {
    state.rows = [];
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(404);
  });

  it("returns success when updated", async () => {
    state.rows = [{ id: "s1" }];
    expect(await (await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).json()).toEqual({ success: true });
  });

  it("accepts a specialFeastKey available for the service's date", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { specialFeastKey: "mary-magdalene" }, error: null } as never);
    // Day select resolves to a Sunday near 22 Jul where Mary Magdalene is available.
    state.dayRows = [{ date: "2026-07-19", sundayKey: null, season: "ORDINARY" }];
    state.rows = [{ id: "s1" }];
    expect(await (await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).json()).toEqual({ success: true });
  });

  it("rejects a specialFeastKey not available for the service's date", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { specialFeastKey: "mary-magdalene" }, error: null } as never);
    state.dayRows = [{ date: "2026-02-15", sundayKey: null, season: "ORDINARY" }];
    state.rows = [{ id: "s1" }];
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(400);
  });

  it("clears the special (null) without availability checks", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { specialFeastKey: null }, error: null } as never);
    state.rows = [{ id: "s1" }];
    expect(await (await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).json()).toEqual({ success: true });
  });
});

describe("DELETE /api/churches/[churchId]/services/[serviceId]", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await DELETE(new Request("http://x", { method: "DELETE" }), ctx)).status).toBe(403);
  });

  it("returns 404 when the service is missing", async () => {
    state.rows = [];
    expect((await DELETE(new Request("http://x", { method: "DELETE" }), ctx)).status).toBe(404);
  });

  it("returns success when deleted", async () => {
    state.rows = [{ id: "s1" }];
    expect(await (await DELETE(new Request("http://x", { method: "DELETE" }), ctx)).json()).toEqual({ success: true });
  });

  it("returns 500 on a delete error", async () => {
    state.throw = true;
    expect((await DELETE(new Request("http://x", { method: "DELETE" }), ctx)).status).toBe(500);
  });
});
