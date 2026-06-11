import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ churchServicePatterns: { id: {}, churchId: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }));

const { state } = vi.hoisted(() => ({ state: { rows: [] as unknown[], throw: false } }));
vi.mock("@/lib/db", () => {
  const terminal = () => (state.throw ? Promise.reject(new Error("db down")) : Promise.resolve(state.rows));
  const chain: Record<string, unknown> = {};
  for (const m of ["set", "where"]) chain[m] = () => chain;
  chain.returning = terminal;
  return { db: { update: () => chain, delete: () => chain } };
});

import { PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", patternId: "pat1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.throw = false;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { enabled: false }, error: null } as never);
});

describe("PATCH .../service-patterns/[patternId]", () => {
  const req = () => new Request("http://x", { method: "PATCH" });

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PATCH(req(), ctx)).status).toBe(403);
  });

  it("returns 400 when no recognised fields are present", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: {}, error: null } as never);
    expect((await PATCH(req(), ctx)).status).toBe(400);
  });

  it("returns 404 when the pattern is missing", async () => {
    state.rows = [];
    expect((await PATCH(req(), ctx)).status).toBe(404);
  });

  it("returns the updated pattern", async () => {
    state.rows = [{ id: "pat1", enabled: false }];
    expect(await (await PATCH(req(), ctx)).json()).toEqual({ id: "pat1", enabled: false });
  });
});

describe("DELETE .../service-patterns/[patternId]", () => {
  const req = () => new Request("http://x", { method: "DELETE" });

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await DELETE(req(), ctx)).status).toBe(403);
  });

  it("returns 404 when the pattern is missing", async () => {
    state.rows = [];
    expect((await DELETE(req(), ctx)).status).toBe(404);
  });

  it("returns 204 No Content on success", async () => {
    state.rows = [{ id: "pat1" }];
    expect((await DELETE(req(), ctx)).status).toBe(204);
  });

  it("returns 500 on a delete error", async () => {
    state.throw = true;
    expect((await DELETE(req(), ctx)).status).toBe(500);
  });
});
