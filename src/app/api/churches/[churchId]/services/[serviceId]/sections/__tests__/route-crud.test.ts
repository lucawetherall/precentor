import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  serviceSections: { id: {}, serviceId: {}, positionOrder: {} },
  services: { id: {}, churchId: {} },
  musicSlotTypeEnum: { enumValues: ["HYMN", "ANTHEM"] },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn(), max: vi.fn() }));

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

const ctx = { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { sectionKey: "intro", title: "Introit", positionOrder: 3 }, error: null } as never);
});

describe("GET .../sections", () => {
  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });

  it("returns 404 when the service is missing", async () => {
    queue.items = [[]];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns the ordered sections", async () => {
    queue.items = [[{ id: "s1" }], [{ id: "sec1" }, { id: "sec2" }]];
    expect(await (await GET(new Request("http://x"), ctx)).json()).toEqual([{ id: "sec1" }, { id: "sec2" }]);
  });
});

describe("POST .../sections", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(400);
  });

  it("returns 404 when the service is missing", async () => {
    queue.items = [[]];
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(404);
  });

  it("creates a section at the requested position and returns 201", async () => {
    // positionOrder provided → no max-position lookup; service then insert.
    queue.items = [[{ id: "s1" }], [{ id: "sec-new", positionOrder: 3 }]];
    const res = await POST(new Request("http://x", { method: "POST" }), ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("sec-new");
  });

  it("appends after the current max when no position is given", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { sectionKey: "k", title: "T" }, error: null } as never);
    queue.items = [[{ id: "s1" }], [{ maxPos: 4 }], [{ id: "sec-new", positionOrder: 5 }]];
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(201);
  });
});
