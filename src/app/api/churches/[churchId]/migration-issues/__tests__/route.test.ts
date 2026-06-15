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
    } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  // The route aggregates severity counts in SQL (.groupBy) and returns only
  // `{ counts }`; the settings page fetches full entries via its own query.
  it("returns severity counts for admin", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const aggregateRows = [
      { severity: "WARN", count: 1 },
      { severity: "ERROR", count: 1 },
    ];
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ groupBy: () => Promise.resolve(aggregateRows) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.counts).toEqual({ INFO: 0, WARN: 1, ERROR: 1 });
  });

  it("returns zero counts when no issues", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ groupBy: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    const json = await res.json();
    expect(json.counts).toEqual({ INFO: 0, WARN: 0, ERROR: 0 });
  });
});
