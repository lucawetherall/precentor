import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ invites: {}, users: {}, churchMemberships: {} }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), gt: vi.fn(), sql: vi.fn(),
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

// invite lookup: db.select().from().where().limit(1)
let inviteResult: unknown[] = [];
const transaction = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ["from", "where"]) chain[m] = () => chain;
      chain.limit = () => Promise.resolve(inviteResult);
      return chain;
    },
    transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { POST } from "../route";
import { rateLimit } from "@/lib/rate-limit";

function req() {
  return new Request("http://x/api/invites/tok/accept", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.9" },
  });
}
const ctx = { params: Promise.resolve({ token: "tok" }) };

beforeEach(() => {
  vi.clearAllMocks();
  inviteResult = [];
  vi.mocked(rateLimit).mockResolvedValue(null);
  getUser.mockResolvedValue({ data: { user: { id: "sup-1", email: "singer@parish.org" } } });
});

describe("POST /api/invites/[token]/accept", () => {
  it("returns the rate-limit response when throttled", async () => {
    vi.mocked(rateLimit).mockResolvedValue(new Response("no", { status: 429 }) as never);
    expect((await POST(req(), ctx)).status).toBe(429);
  });

  it("returns 401 when not signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(req(), ctx)).status).toBe(401);
  });

  it("returns 404 for an invalid or expired token", async () => {
    inviteResult = [];
    expect((await POST(req(), ctx)).status).toBe(404);
  });

  it("returns 403 when the invite was sent to a different email", async () => {
    inviteResult = [{ id: "inv-1", email: "someone-else@parish.org", churchId: "c1", role: "MEMBER" }];
    const res = await POST(req(), ctx);
    expect(res.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("accepts an open invite (no recipient email) regardless of the signed-in email", async () => {
    inviteResult = [{ id: "inv-1", email: null, churchId: "c1", role: "MEMBER" }];
    transaction.mockResolvedValue({ alreadyAccepted: false, churchId: "c1" });
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ churchId: "c1" });
  });

  it("matches recipient email case-insensitively and grants membership", async () => {
    inviteResult = [{ id: "inv-1", email: "Singer@Parish.org", churchId: "c1", role: "EDITOR" }];
    transaction.mockResolvedValue({ alreadyAccepted: false, churchId: "c1" });
    expect((await POST(req(), ctx)).status).toBe(200);
  });

  it("returns 409 when the invite was already accepted (lost the race)", async () => {
    inviteResult = [{ id: "inv-1", email: "singer@parish.org", churchId: "c1", role: "MEMBER" }];
    transaction.mockResolvedValue({ alreadyAccepted: true });
    expect((await POST(req(), ctx)).status).toBe(409);
  });

  it("returns 400 when no email is available to persist the user", async () => {
    inviteResult = [{ id: "inv-1", email: "singer@parish.org", churchId: "c1", role: "MEMBER" }];
    transaction.mockResolvedValue({ missingEmail: true });
    expect((await POST(req(), ctx)).status).toBe(400);
  });

  it("returns 500 when the transaction throws", async () => {
    inviteResult = [{ id: "inv-1", email: "singer@parish.org", churchId: "c1", role: "MEMBER" }];
    transaction.mockRejectedValue(new Error("boom"));
    expect((await POST(req(), ctx)).status).toBe(500);
  });
});
