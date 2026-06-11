import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ churchServicePatterns: { churchId: {} }, churchServicePresets: { id: {}, churchId: {} } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));

const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({ db: { select: () => proxyFor(), insert: () => proxyFor() } }));

import { GET, POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { presetId: "p1", dayOfWeek: 0, enabled: true }, error: null } as never);
});

describe("GET .../service-patterns", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });

  it("returns the church's patterns", async () => {
    queue.items = [[{ id: "pat1" }]];
    expect(await (await GET(new Request("http://x"), ctx)).json()).toEqual([{ id: "pat1" }]);
  });
});

describe("POST .../service-patterns", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(400);
  });

  it("returns 400 when the preset belongs to another church", async () => {
    queue.items = [[]]; // ownership lookup empty
    const res = await POST(new Request("http://x", { method: "POST" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Preset not found/);
  });

  it("creates a pattern when the preset is owned and returns 201", async () => {
    queue.items = [[{ id: "p1" }], [{ id: "pat-new" }]];
    const res = await POST(new Request("http://x", { method: "POST" }), ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("pat-new");
  });
});
