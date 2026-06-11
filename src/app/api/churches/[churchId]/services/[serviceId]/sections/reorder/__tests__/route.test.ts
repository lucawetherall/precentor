import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ serviceSections: { id: {}, serviceId: {}, positionOrder: {} }, services: { id: {}, churchId: {} } }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), inArray: vi.fn(), count: vi.fn(),
  sql: Object.assign((s: unknown) => s, { join: vi.fn() }),
}));

const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({ db: { select: () => proxyFor(), update: () => proxyFor() } }));

import { PUT } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) };
const put = () => new Request("http://x", { method: "PUT" });

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { sectionIds: ["a", "b"] }, error: null } as never);
});

describe("PUT .../sections/reorder", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PUT(put(), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PUT(put(), ctx)).status).toBe(400);
  });

  it("returns 404 when the service is missing", async () => {
    queue.items = [[]];
    expect((await PUT(put(), ctx)).status).toBe(404);
  });

  it("returns 400 when an id does not belong to the service", async () => {
    queue.items = [[{ id: "s1" }], [{ id: "a" }]]; // only one of two ids found
    const res = await PUT(put(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/do not belong/);
  });

  it("returns 400 when the id list is incomplete", async () => {
    queue.items = [[{ id: "s1" }], [{ id: "a" }, { id: "b" }], [{ total: 3 }]];
    const res = await PUT(put(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/all sections/);
  });

  it("applies the new ordering and returns success", async () => {
    queue.items = [[{ id: "s1" }], [{ id: "a" }, { id: "b" }], [{ total: 2 }]];
    expect(await (await PUT(put(), ctx)).json()).toEqual({ success: true });
  });
});
