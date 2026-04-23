import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("GET /api/churches/[churchId]/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when not a member", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({
      error: new Response("Forbidden", { status: 403 }),
    } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns catalog with memberCount joined per role", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const mockRows = [
      { id: "r1", key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100, memberCount: 3 },
    ];
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ leftJoin: () => ({ groupBy: () => ({ orderBy: () => Promise.resolve(mockRows) }) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    const json = await res.json();
    expect(json[0].memberCount).toBe(3);
  });
});
