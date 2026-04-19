import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { GET } from "../route";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("GET /api/role-catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: null,
      error: new Response("Unauthorized", { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the catalog ordered by displayOrder when authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" }, error: null });
    const createdAt = new Date().toISOString();
    const mockRows = [
      { id: "r1", key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100, createdAt },
    ];
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ orderBy: () => Promise.resolve(mockRows) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual(mockRows);
  });
});
