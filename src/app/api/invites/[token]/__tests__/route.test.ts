import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ invites: {}, churches: {} }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), gt: vi.fn(),
}));

// Chain whose terminal `.limit()` resolves to a queued result set.
let limitResult: unknown[] = [];
let throwOnQuery = false;
const select = vi.fn(() => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where"]) chain[m] = () => chain;
  chain.limit = () => {
    if (throwOnQuery) return Promise.reject(new Error("db down"));
    return Promise.resolve(limitResult);
  };
  return chain;
});
vi.mock("@/lib/db", () => ({ db: { select: () => select() } }));

import { GET } from "../route";
import { rateLimit } from "@/lib/rate-limit";

function req() {
  return new Request("http://x/api/invites/tok123", {
    headers: { "x-forwarded-for": "203.0.113.5" },
  });
}
const ctx = { params: Promise.resolve({ token: "tok123" }) };

beforeEach(() => {
  vi.clearAllMocks();
  limitResult = [];
  throwOnQuery = false;
  vi.mocked(rateLimit).mockResolvedValue(null);
});

describe("GET /api/invites/[token]", () => {
  it("returns the rate-limit response when the IP is throttled", async () => {
    vi.mocked(rateLimit).mockResolvedValue(new Response("Too Many", { status: 429 }) as never);
    const res = await GET(req(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 for an unknown / expired / already-accepted token", async () => {
    limitResult = [];
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns the invite details for a valid token", async () => {
    limitResult = [{ email: "singer@parish.org", role: "MEMBER", churchName: "St John's" }];
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "singer@parish.org", role: "MEMBER", churchName: "St John's" });
  });

  it("returns 500 when the lookup throws", async () => {
    throwOnQuery = true;
    const res = await GET(req(), ctx);
    expect(res.status).toBe(500);
  });
});
