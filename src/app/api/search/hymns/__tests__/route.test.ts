import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/search/hymns", () => ({ searchHymns: vi.fn() }));

import { GET } from "../route";
import { rateLimit } from "@/lib/rate-limit";
import { searchHymns } from "@/lib/search/hymns";

const req = (qs: string) => new NextRequest(`http://x/api/search/hymns?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  vi.mocked(rateLimit).mockResolvedValue(null);
  vi.mocked(searchHymns).mockResolvedValue([]);
});

describe("GET /api/search/hymns", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(req("q=grace"))).status).toBe(401);
  });

  it("returns the rate-limit response when throttled", async () => {
    vi.mocked(rateLimit).mockResolvedValue(new Response("no", { status: 429 }) as never);
    expect((await GET(req("q=grace"))).status).toBe(429);
  });

  it("returns an empty array for a blank query without hitting the search", async () => {
    const res = await GET(req("q=%20"));
    expect(await res.json()).toEqual([]);
    expect(searchHymns).not.toHaveBeenCalled();
  });

  it("returns 400 for an over-long query", async () => {
    expect((await GET(req(`q=${"a".repeat(201)}`))).status).toBe(400);
  });

  it("only forwards a valid book filter to the search", async () => {
    await GET(req("q=grace&book=XYZ"));
    expect(searchHymns).toHaveBeenCalledWith("grace", undefined, 0);
    await GET(req("q=grace&book=NEH"));
    expect(searchHymns).toHaveBeenCalledWith("grace", "NEH", 0);
  });

  it("clamps a negative or huge offset into range", async () => {
    await GET(req("q=grace&offset=-5"));
    expect(searchHymns).toHaveBeenCalledWith("grace", undefined, 0);
    await GET(req("q=grace&offset=99999"));
    expect(searchHymns).toHaveBeenCalledWith("grace", undefined, 1000);
  });

  it("reports hasMore when a full page of 20 is returned", async () => {
    vi.mocked(searchHymns).mockResolvedValue(Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) as never);
    expect((await (await GET(req("q=grace"))).json()).hasMore).toBe(true);
  });

  it("returns 500 when the search throws", async () => {
    vi.mocked(searchHymns).mockRejectedValue(new Error("boom"));
    expect((await GET(req("q=grace"))).status).toBe(500);
  });
});
