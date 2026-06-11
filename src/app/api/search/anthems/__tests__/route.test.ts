import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/search/anthems", () => ({ searchAnthems: vi.fn() }));

import { GET } from "../route";
import { rateLimit } from "@/lib/rate-limit";
import { requireChurchRole } from "@/lib/auth/permissions";
import { searchAnthems } from "@/lib/search/anthems";

const req = (qs: string) => new NextRequest(`http://x/api/search/anthems?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  vi.mocked(rateLimit).mockResolvedValue(null);
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(searchAnthems).mockResolvedValue([]);
});

describe("GET /api/search/anthems", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(req("q=ave"))).status).toBe(401);
  });

  it("enforces church membership when a churchId is supplied", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(req("q=ave&churchId=c1"))).status).toBe(403);
    expect(searchAnthems).not.toHaveBeenCalled();
  });

  it("does not require church membership for a global search", async () => {
    await GET(req("q=ave"));
    expect(requireChurchRole).not.toHaveBeenCalled();
    expect(searchAnthems).toHaveBeenCalledWith("ave", undefined, 0);
  });

  it("returns [] for a blank query", async () => {
    expect(await (await GET(req("q="))).json()).toEqual([]);
  });

  it("scopes the search to the church when authorized", async () => {
    await GET(req("q=ave&churchId=c1"));
    expect(searchAnthems).toHaveBeenCalledWith("ave", "c1", 0);
  });

  it("returns 500 when the search throws", async () => {
    vi.mocked(searchAnthems).mockRejectedValue(new Error("boom"));
    expect((await GET(req("q=ave"))).status).toBe(500);
  });
});
