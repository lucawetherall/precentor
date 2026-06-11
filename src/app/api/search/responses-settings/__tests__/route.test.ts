import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/search/responses-settings", () => ({ searchResponsesSettings: vi.fn() }));

import { GET } from "../route";
import { rateLimit } from "@/lib/rate-limit";
import { requireChurchRole } from "@/lib/auth/permissions";
import { searchResponsesSettings } from "@/lib/search/responses-settings";

const req = (qs: string) => new NextRequest(`http://x/api/search/responses-settings?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  vi.mocked(rateLimit).mockResolvedValue(null);
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(searchResponsesSettings).mockResolvedValue([]);
});

describe("GET /api/search/responses-settings", () => {
  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(req("q=ferial"))).status).toBe(401);
  });

  it("enforces church membership when a churchId is supplied", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(req("q=ferial&churchId=c1"))).status).toBe(403);
  });

  it("returns { results: [] } for a blank query", async () => {
    expect(await (await GET(req("q="))).json()).toEqual({ results: [] });
  });

  it("returns 400 for an over-long query", async () => {
    expect((await GET(req(`q=${"a".repeat(201)}`))).status).toBe(400);
  });

  it("wraps results in a { results } envelope", async () => {
    vi.mocked(searchResponsesSettings).mockResolvedValue([{ id: "r1" }] as never);
    expect(await (await GET(req("q=ferial"))).json()).toEqual({ results: [{ id: "r1" }] });
  });

  it("returns 500 when the search throws", async () => {
    vi.mocked(searchResponsesSettings).mockRejectedValue(new Error("boom"));
    expect((await GET(req("q=ferial"))).status).toBe(500);
  });
});
