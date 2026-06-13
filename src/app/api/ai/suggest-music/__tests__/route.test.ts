import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn(), requireChurchRole: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/ai/quota", () => ({ consumeAiQuota: vi.fn() }));
vi.mock("@/lib/ai/provider", () => ({ createLLMProvider: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ services: {}, liturgicalDays: {}, readings: {}, performanceLogs: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), gte: vi.fn(), desc: vi.fn() }));

const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({ db: { select: () => proxyFor() } }));

import { POST } from "../route";
import { requireAuth, requireChurchRole } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api/parse-body";
import { consumeAiQuota } from "@/lib/ai/quota";
import { createLLMProvider } from "@/lib/ai/provider";

const suggestMusic = vi.fn();
const serviceRow = { service: { id: "s1", churchId: "c1" }, day: { id: "d1", date: "2026-01-01", cwName: "Epiphany", season: "EPIPHANY", colour: "WHITE", collect: null } };

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [[serviceRow], [], []]; // service, readings, recentPerfs
  queue.i = 0;
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" }, error: null } as never);
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(rateLimit).mockResolvedValue(null);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { serviceId: "s1", slotType: "GRADUAL_HYMN" }, error: null } as never);
  vi.mocked(consumeAiQuota).mockResolvedValue({ allowed: true, used: 1, limit: 200 });
  suggestMusic.mockResolvedValue([{ title: "Hymn 1" }]);
  vi.mocked(createLLMProvider).mockReturnValue({ suggestMusic } as never);
});

const req = () => new Request("http://x/api/ai/suggest-music", { method: "POST" });

describe("POST /api/ai/suggest-music", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await POST(req())).status).toBe(401);
  });

  it("returns the rate-limit response when throttled", async () => {
    vi.mocked(rateLimit).mockResolvedValue(new Response("no", { status: 429 }) as never);
    expect((await POST(req())).status).toBe(429);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(req())).status).toBe(400);
  });

  it("returns 404 when the service does not exist", async () => {
    queue.items = [[], [], []];
    expect((await POST(req())).status).toBe(404);
  });

  it("returns 403 when the caller is not an editor of the service's church", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(consumeAiQuota).not.toHaveBeenCalled();
  });

  it("returns 429 when the daily AI quota is exhausted", async () => {
    vi.mocked(consumeAiQuota).mockResolvedValue({ allowed: false, used: 201, limit: 200 });
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(suggestMusic).not.toHaveBeenCalled();
  });

  it("returns suggestions on the happy path", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: [{ title: "Hymn 1" }] });
  });

  it("returns 500 when the provider throws", async () => {
    suggestMusic.mockRejectedValue(new Error("gemini down"));
    expect((await POST(req())).status).toBe(500);
  });
});
