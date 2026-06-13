import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({ hymnVerses: { hymnId: {}, verseNumber: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

const { result } = vi.hoisted(() => ({ result: { rows: [] as unknown[] } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) chain[m] = () => chain;
  chain.orderBy = () => Promise.resolve(result.rows);
  return { db: { select: () => chain } };
});

import { GET } from "../route";
import { requireAuth } from "@/lib/auth/permissions";

// The route validates hymnId is a UUID, so use a syntactically valid one.
const ctx = { params: Promise.resolve({ hymnId: "11111111-1111-4111-8111-111111111111" }) };

beforeEach(() => {
  vi.clearAllMocks();
  result.rows = [];
  vi.mocked(requireAuth).mockResolvedValue({ error: null } as never);
});

describe("GET /api/hymns/[hymnId]/verses", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(401);
  });

  it("returns the verses ordered for the hymn", async () => {
    result.rows = [{ verseNumber: 1 }, { verseNumber: 2 }];
    const res = await GET(new Request("http://x"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ verseNumber: 1 }, { verseNumber: 2 }]);
  });
});
