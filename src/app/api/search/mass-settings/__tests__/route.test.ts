import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/search/mass-settings", () => ({ searchMassSettings: vi.fn() }));

import { GET } from "../route";
import { rateLimit } from "@/lib/rate-limit";
import { requireChurchRole } from "@/lib/auth/permissions";
import { searchMassSettings } from "@/lib/search/mass-settings";

const req = (qs: string) => new NextRequest(`http://x/api/search/mass-settings?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  vi.mocked(rateLimit).mockResolvedValue(null);
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(searchMassSettings).mockResolvedValue([]);
});

describe("GET /api/search/mass-settings", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(req("q=byrd&churchId=c1"))).status).toBe(401);
  });

  it("returns 400 when churchId is missing (mass settings are church-scoped)", async () => {
    const res = await GET(req("q=byrd"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/churchId/);
  });

  it("returns 403 when the caller is not a church member", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(req("q=byrd&churchId=c1"))).status).toBe(403);
  });

  it("returns [] for a blank query", async () => {
    expect(await (await GET(req("q=&churchId=c1"))).json()).toEqual([]);
  });

  it("forwards the query and church to the search", async () => {
    await GET(req("q=byrd&churchId=c1&offset=20"));
    expect(searchMassSettings).toHaveBeenCalledWith("byrd", "c1", 20);
  });

  it("returns 500 when the search throws", async () => {
    vi.mocked(searchMassSettings).mockRejectedValue(new Error("boom"));
    expect((await GET(req("q=byrd&churchId=c1"))).status).toBe(500);
  });
});
