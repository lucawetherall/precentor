import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/churches/default-setup", () => ({ createDefaultChurchSetup: vi.fn() }));
vi.mock("@/lib/services/auto-generate", () => ({ generateServicesForChurch: vi.fn() }));
vi.mock("@/lib/lectionary/calendar", () => ({ getChurchYear: vi.fn(() => ({ endYear: 2026 })) }));
vi.mock("@/lib/db/schema", () => ({
  churches: {}, churchMemberships: {}, users: { supabaseId: {} }, liturgicalDays: {}, services: {},
  serviceTypeEnum: { enumValues: ["SUNG_EUCHARIST", "EVENSONG"] },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

const { dbState } = vi.hoisted(() => ({ dbState: { user: [] as unknown[], tx: vi.fn() } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) chain[m] = () => chain;
  chain.limit = () => Promise.resolve(dbState.user);
  return { db: { select: () => chain, transaction: (...a: unknown[]) => dbState.tx(...a) } };
});

import { POST } from "../route";
import { parseJsonBody } from "@/lib/api/parse-body";
import { generateServicesForChurch } from "@/lib/services/auto-generate";

function makePost(body: Record<string, unknown> = { name: "St Mary's" }) {
  vi.mocked(parseJsonBody).mockResolvedValue({ data: body, error: null } as never);
  return new Request("http://x/api/churches", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "sup-1" } } });
  dbState.user = [{ id: "user-1" }];
  dbState.tx.mockResolvedValue({ id: "church-1", name: "St Mary's" });
});

describe("POST /api/churches", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(makePost())).status).toBe(401);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }))).status).toBe(400);
  });

  it("returns 404 when the signed-in user has no db record", async () => {
    dbState.user = [];
    expect((await POST(makePost())).status).toBe(404);
  });

  it("creates a church and generates default services when none are supplied", async () => {
    const res = await POST(makePost({ name: "St Mary's" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "church-1", name: "St Mary's" });
    expect(generateServicesForChurch).toHaveBeenCalledOnce();
  });

  it("skips service generation when explicit defaultServices are supplied", async () => {
    await POST(makePost({ name: "St Mary's", defaultServices: [{ type: "SUNG_EUCHARIST", time: "10:00" }] }));
    expect(generateServicesForChurch).not.toHaveBeenCalled();
  });

  it("still returns 201 when best-effort service generation fails", async () => {
    vi.mocked(generateServicesForChurch).mockRejectedValue(new Error("gen failed"));
    expect((await POST(makePost({ name: "St Mary's" }))).status).toBe(201);
  });

  it("returns 500 when the transaction throws", async () => {
    dbState.tx.mockRejectedValue(new Error("db down"));
    expect((await POST(makePost())).status).toBe(500);
  });
});
