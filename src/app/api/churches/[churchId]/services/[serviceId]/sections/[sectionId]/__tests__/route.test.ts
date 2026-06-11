import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  serviceSections: { id: {}, serviceId: {}, positionOrder: {} },
  services: { id: {}, churchId: {} },
  musicSlotTypeEnum: { enumValues: ["HYMN", "ANTHEM"] },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), asc: vi.fn(), inArray: vi.fn(),
  sql: Object.assign((s: unknown) => s, { join: vi.fn() }),
}));

const { state } = vi.hoisted(() => ({ state: { queue: { items: [] as unknown[][], i: 0 }, tx: vi.fn() } }));
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(state.queue.items[state.queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({
  db: { select: () => proxyFor(), update: () => proxyFor(), transaction: (...a: unknown[]) => state.tx(...a) },
}));

import { PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", serviceId: "s1", sectionId: "sec1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  state.queue.items = [];
  state.queue.i = 0;
  state.tx.mockResolvedValue(undefined);
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { visible: false }, error: null } as never);
});

describe("PATCH .../sections/[sectionId]", () => {
  const req = () => new Request("http://x", { method: "PATCH" });

  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PATCH(req(), ctx)).status).toBe(403);
  });

  it("returns 404 when the service is missing", async () => {
    state.queue.items = [[]];
    expect((await PATCH(req(), ctx)).status).toBe(404);
  });

  it("returns 404 when the section is missing", async () => {
    state.queue.items = [[{ id: "s1" }], []];
    expect((await PATCH(req(), ctx)).status).toBe(404);
  });

  it("returns 400 when no recognised fields are present", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: {}, error: null } as never);
    state.queue.items = [[{ id: "s1" }], [{ id: "sec1" }]];
    expect((await PATCH(req(), ctx)).status).toBe(400);
  });

  it("updates the section and returns it", async () => {
    state.queue.items = [[{ id: "s1" }], [{ id: "sec1" }], [{ id: "sec1", visible: false }]];
    expect(await (await PATCH(req(), ctx)).json()).toEqual({ id: "sec1", visible: false });
  });
});

describe("DELETE .../sections/[sectionId]", () => {
  const req = () => new Request("http://x", { method: "DELETE" });

  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await DELETE(req(), ctx)).status).toBe(403);
  });

  it("returns 404 when the section is missing", async () => {
    state.queue.items = [[{ id: "s1" }], []];
    expect((await DELETE(req(), ctx)).status).toBe(404);
  });

  it("deletes the section and renumbers in a transaction", async () => {
    state.queue.items = [[{ id: "s1" }], [{ id: "sec1" }]];
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(200);
    expect(state.tx).toHaveBeenCalledOnce();
  });

  it("returns 500 when the transaction throws", async () => {
    state.queue.items = [[{ id: "s1" }], [{ id: "sec1" }]];
    state.tx.mockRejectedValue(new Error("db down"));
    expect((await DELETE(req(), ctx)).status).toBe(500);
  });
});
