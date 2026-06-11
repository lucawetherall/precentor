import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/db/schema", () => ({ massSettings: { id: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

const { result } = vi.hoisted(() => ({ result: { rows: [] as unknown[] } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) chain[m] = () => chain;
  chain.limit = () => Promise.resolve(result.rows);
  return { db: { select: () => chain } };
});

import { GET } from "../route";

const ctx = { params: Promise.resolve({ massSettingId: "ms1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  result.rows = [];
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("GET /api/mass-settings/[massSettingId]", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(new Request("http://x"), ctx)).status).toBe(401);
  });

  it("returns 404 when the setting does not exist", async () => {
    result.rows = [];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns the projected setting fields", async () => {
    result.rows = [{ id: "ms1", name: "Mass for Four Voices", composer: "Byrd", movements: ["KYRIE"], extra: "ignored" }];
    const res = await GET(new Request("http://x"), ctx);
    expect(await res.json()).toEqual({ id: "ms1", name: "Mass for Four Voices", composer: "Byrd", movements: ["KYRIE"] });
  });
});
