import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireAuth: vi.fn(),
  getChurchMembership: vi.fn(),
}));
vi.mock("@/lib/db/schema", () => ({ anthems: { id: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

const { result } = vi.hoisted(() => ({ result: { rows: [] as unknown[] } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) chain[m] = () => chain;
  chain.limit = () => Promise.resolve(result.rows);
  return { db: { select: () => chain } };
});

import { GET } from "../route";
import { requireAuth, getChurchMembership } from "@/lib/auth/permissions";

// Route validates the id is a UUID, so use a syntactically valid one.
const ctx = { params: Promise.resolve({ anthemId: "33333333-3333-4333-8333-333333333333" }) };

beforeEach(() => {
  vi.clearAllMocks();
  result.rows = [];
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" }, error: null } as never);
  vi.mocked(getChurchMembership).mockResolvedValue(null as never);
});

describe("GET /api/anthems/[anthemId]", () => {
  it("returns 401 when not signed in", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(401);
  });

  it("returns 404 for a non-UUID id", async () => {
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ anthemId: "a1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the anthem does not exist", async () => {
    result.rows = [];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns a global anthem (no churchId) to any signed-in user", async () => {
    result.rows = [{ id: "a1", title: "Ave verum", composer: "Byrd", voicing: "SATB", churchId: null, extra: "x" }];
    const res = await GET(new Request("http://x"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "a1", title: "Ave verum", composer: "Byrd", voicing: "SATB" });
    expect(getChurchMembership).not.toHaveBeenCalled();
  });

  it("hides a church-scoped anthem from non-members (404)", async () => {
    result.rows = [{ id: "a2", title: "Anthem", composer: "X", voicing: null, churchId: "other-church" }];
    vi.mocked(getChurchMembership).mockResolvedValue(null as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns a church-scoped anthem to a member", async () => {
    result.rows = [{ id: "a3", title: "Anthem", composer: "X", voicing: "SSA", churchId: "c1" }];
    vi.mocked(getChurchMembership).mockResolvedValue({ id: "m1", role: "MEMBER" } as never);
    const res = await GET(new Request("http://x"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "a3", title: "Anthem", composer: "X", voicing: "SSA" });
  });
});
