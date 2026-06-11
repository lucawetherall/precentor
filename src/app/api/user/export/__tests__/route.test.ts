import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({ users: { id: {} }, churchMemberships: { userId: {} }, availability: { userId: {} }, rotaEntries: { userId: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

// Each select resolves to the next canned result, in the order the route
// builds them: profile, memberships, availability, rotaEntries.
const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
// A chain proxy whose every method returns another chain, and whose terminal
// `await` pulls the next canned result from a shared FIFO queue.
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({ db: { select: () => proxyFor() } }));

import { GET } from "../route";
import { requireAuth } from "@/lib/auth/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" }, error: null } as never);
});

describe("GET /api/user/export", () => {
  it("returns the auth error when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await GET()).status).toBe(401);
  });

  it("returns a downloadable JSON export with the user's data", async () => {
    queue.items = [
      [{ id: "u1", email: "a@b.org", name: "Singer", createdAt: "2026-01-01" }],
      [{ churchId: "c1", role: "MEMBER", joinedAt: "2026-02-01" }],
      [{ serviceId: "s1", status: "AVAILABLE" }],
      [{ serviceId: "s1", confirmed: true }],
    ];
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("precentor-data-export.json");
    const body = await res.json();
    expect(body.profile.email).toBe("a@b.org");
    expect(body.churchMemberships).toEqual([{ churchId: "c1", role: "MEMBER", joinedAt: "2026-02-01" }]);
    expect(body.availability).toEqual([{ serviceId: "s1", status: "AVAILABLE" }]);
    expect(body.rotaEntries).toEqual([{ serviceId: "s1", confirmed: true }]);
  });

  it("emits a null profile when the user row is missing", async () => {
    queue.items = [[], [], [], []];
    const body = await (await GET()).json();
    expect(body.profile).toBeNull();
  });
});
