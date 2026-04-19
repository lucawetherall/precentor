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

describe("GET /api/churches/[churchId]/migration-issues", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({
      error: new Response("Forbidden", { status: 403 }),
    });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns counts and entries for admin", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const mockEntries = [
      { id: "e1", phase: "B", churchId: "c1", severity: "WARN", code: "PRESET_TIME_AMBIGUOUS", details: {}, dismissedAt: null, createdAt: new Date() },
      { id: "e2", phase: "B", churchId: "c1", severity: "ERROR", code: "ROTA_ENTRY_UNCLASSIFIED", details: {}, dismissedAt: null, createdAt: new Date() },
    ];
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => Promise.resolve(mockEntries) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.counts).toEqual({ INFO: 0, WARN: 1, ERROR: 1 });
    expect(json.entries).toHaveLength(2);
  });

  it("returns zero counts when no issues", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => Promise.resolve([]) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    const json = await res.json();
    expect(json.counts).toEqual({ INFO: 0, WARN: 0, ERROR: 0 });
    expect(json.entries).toHaveLength(0);
  });
});
