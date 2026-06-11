import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({ collects: { churchId: {}, liturgicalDayId: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn((...c) => c), or: vi.fn(), isNull: vi.fn() }));

const { state } = vi.hoisted(() => ({ state: { rows: [] as unknown[], lastWhere: undefined as unknown } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = (arg: unknown) => { state.lastWhere = arg; return Promise.resolve(state.rows); };
  return { db: { select: () => chain } };
});

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  state.lastWhere = undefined;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
});

describe("GET /api/churches/[churchId]/collects", () => {
  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x/api/churches/c1/collects"), ctx)).status).toBe(403);
  });

  it("returns church-and-global collects", async () => {
    state.rows = [{ id: "col1" }];
    const res = await GET(new Request("http://x/api/churches/c1/collects"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "col1" }]);
    // No day filter → single OR condition.
    expect((state.lastWhere as unknown[]).length).toBe(1);
  });

  it("adds a liturgicalDayId filter when supplied", async () => {
    await GET(new Request("http://x/api/churches/c1/collects?liturgicalDayId=day-1"), ctx);
    expect((state.lastWhere as unknown[]).length).toBe(2);
  });
});
