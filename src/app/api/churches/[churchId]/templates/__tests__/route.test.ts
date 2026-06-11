import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  churchTemplates: { id: {}, name: {}, baseTemplateId: {}, churchId: {} },
  churchTemplateSections: {},
  serviceTypeTemplates: { id: {}, serviceType: {}, rite: {} },
  templateSections: { templateId: {} },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

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
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { baseTemplateId: "base1" }, error: null } as never);
});

describe("GET .../templates", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });

  it("returns the church templates joined with their base type", async () => {
    queue.items = [[{ id: "t1", serviceType: "SUNG_EUCHARIST" }]];
    expect(await (await GET(new Request("http://x"), ctx)).json()).toEqual([{ id: "t1", serviceType: "SUNG_EUCHARIST" }]);
  });
});

describe("POST .../templates", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(400);
  });

  it("returns 404 when the base template does not exist", async () => {
    queue.items = [[]]; // base template lookup empty
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(404);
  });

  it("clones the base template and its sections, returning 201", async () => {
    queue.items = [
      [{ id: "base1", name: "Evensong" }], // base template
      [{ id: "t-new", name: "Evensong" }], // inserted church template
      [{ sectionKey: "intro", title: "Introit", positionOrder: 1, optional: false, allowOverride: true }], // base sections
    ];
    const res = await POST(new Request("http://x", { method: "POST" }), ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("t-new");
  });

  it("creates a template with no sections to copy", async () => {
    queue.items = [[{ id: "base1", name: "Evensong" }], [{ id: "t-new" }], []];
    expect((await POST(new Request("http://x", { method: "POST" }), ctx)).status).toBe(201);
  });
});
