import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db/schema", () => ({ eucharisticPrayers: {} }));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: () => ({ from }) } }));

import { GET } from "../route";
import { requireAuth } from "@/lib/auth/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue({ error: null } as never);
});

describe("GET /api/eucharistic-prayers", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await GET()).status).toBe(401);
  });

  it("returns the list of prayers for an authenticated user", async () => {
    from.mockResolvedValue([{ id: "p1", name: "Prayer A" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "p1", name: "Prayer A" }]);
  });
});
