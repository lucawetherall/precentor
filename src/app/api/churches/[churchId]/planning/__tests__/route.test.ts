import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/planning/data", () => ({ getPlanningData: vi.fn() }));

import type { NextRequest } from "next/server";
import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { getPlanningData } from "@/lib/planning/data";

// The route only reads `req.url`, so a plain Request stands in for NextRequest.
function makeReq(query: string) {
  return new Request(`http://x/api/churches/c1/planning${query}`) as unknown as NextRequest;
}

describe("GET planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "e1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(getPlanningData).mockResolvedValue({ patterns: [], services: [], days: [] } as unknown as Awaited<ReturnType<typeof getPlanningData>>);
  });

  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await GET(makeReq("?from=2026-01-01&to=2026-02-01"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when from/to are missing", async () => {
    const res = await GET(makeReq(""), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(400);
    expect(getPlanningData).not.toHaveBeenCalled();
  });

  it("returns 400 (not a 500) for an impossible calendar date", async () => {
    const res = await GET(makeReq("?from=2026-13-99&to=2026-02-01"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(400);
    // The malformed date must never reach the DATE column.
    expect(getPlanningData).not.toHaveBeenCalled();
  });

  it("returns 400 for a wrong-shape date", async () => {
    const res = await GET(makeReq("?from=01/02/2026&to=2026-02-01"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(400);
    expect(getPlanningData).not.toHaveBeenCalled();
  });

  it("passes a valid range through to getPlanningData and returns 200", async () => {
    const res = await GET(makeReq("?from=2026-01-01&to=2026-02-15"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(200);
    expect(getPlanningData).toHaveBeenCalledWith("c1", "2026-01-01", "2026-02-15");
  });
});
