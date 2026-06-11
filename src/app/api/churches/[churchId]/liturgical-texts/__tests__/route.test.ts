import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({ liturgicalTexts: { id: {}, key: {}, title: {}, rite: {}, category: {} } }));
vi.mock("drizzle-orm", () => ({ ilike: vi.fn(), or: vi.fn() }));

const { state } = vi.hoisted(() => ({ state: { rows: [] as unknown[], whereCalled: false } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => { state.whereCalled = true; return chain; };
  chain.orderBy = () => Promise.resolve(state.rows);
  return { db: { select: () => chain } };
});

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.whereCalled = false;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
});

describe("GET /api/churches/[churchId]/liturgical-texts", () => {
  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x/api/churches/c1/liturgical-texts"), ctx)).status).toBe(403);
  });

  it("lists all texts when no query is given (no WHERE filter)", async () => {
    state.rows = [{ id: "t1", title: "Gloria" }];
    const res = await GET(new Request("http://x/api/churches/c1/liturgical-texts"), ctx);
    expect(await res.json()).toEqual([{ id: "t1", title: "Gloria" }]);
    expect(state.whereCalled).toBe(false);
  });

  it("applies a search filter when q is present", async () => {
    await GET(new Request("http://x/api/churches/c1/liturgical-texts?q=glor"), ctx);
    expect(state.whereCalled).toBe(true);
  });

  it("ignores a whitespace-only query", async () => {
    await GET(new Request("http://x/api/churches/c1/liturgical-texts?q=%20%20"), ctx);
    expect(state.whereCalled).toBe(false);
  });
});
