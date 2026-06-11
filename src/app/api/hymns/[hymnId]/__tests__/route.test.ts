import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/db/schema", () => ({ hymns: { id: {} }, hymnVerses: { hymnId: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

// Proxy chain whose terminal `await` pulls the next canned result set.
const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
vi.mock("@/lib/db", () => {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxy;
    },
  });
  return { db: { select: () => proxy } };
});

import { GET } from "../route";

const ctx = { params: Promise.resolve({ hymnId: "h1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("GET /api/hymns/[hymnId]", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(new Request("http://x"), ctx)).status).toBe(401);
  });

  it("returns 404 when the hymn does not exist", async () => {
    queue.items = [[]];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns the hymn with a totalVerses count", async () => {
    queue.items = [
      [{ id: "h1", firstLine: "Abide with me" }],
      [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    ];
    const res = await GET(new Request("http://x"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "h1", firstLine: "Abide with me", totalVerses: 3 });
  });
});
