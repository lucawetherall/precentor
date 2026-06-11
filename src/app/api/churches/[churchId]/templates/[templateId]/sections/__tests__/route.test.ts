import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  churchTemplates: { id: {}, churchId: {} },
  churchTemplateSections: { churchTemplateId: {}, positionOrder: {} },
  musicSlotTypeEnum: { enumValues: ["HYMN", "ANTHEM"] },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), asc: vi.fn(), and: vi.fn() }));

const { queue } = vi.hoisted(() => ({ queue: { items: [] as unknown[][], i: 0 } }));
function proxyFor(): unknown {
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === "then") return (r: (v: unknown) => void) => r(queue.items[queue.i++] ?? []);
      return () => proxyFor();
    },
  });
}
vi.mock("@/lib/db", () => ({ db: { select: () => proxyFor(), insert: () => proxyFor(), delete: () => proxyFor() } }));

import { GET, PUT, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", templateId: "t1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  queue.items = [];
  queue.i = 0;
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { sections: [] }, error: null } as never);
});

describe("GET .../templates/[templateId]/sections", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(new Request("http://x"), ctx)).status).toBe(403);
  });

  it("returns 404 when the template is missing", async () => {
    queue.items = [[]];
    expect((await GET(new Request("http://x"), ctx)).status).toBe(404);
  });

  it("returns the ordered sections", async () => {
    queue.items = [[{ id: "t1" }], [{ id: "sec1" }]];
    expect(await (await GET(new Request("http://x"), ctx)).json()).toEqual([{ id: "sec1" }]);
  });
});

describe("PUT .../templates/[templateId]/sections", () => {
  const req = () => new Request("http://x", { method: "PUT" });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PUT(req(), ctx)).status).toBe(400);
  });

  it("returns 404 when the template is missing", async () => {
    queue.items = [[]];
    expect((await PUT(req(), ctx)).status).toBe(404);
  });

  it("replaces sections and returns success", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: { sections: [{ sectionKey: "k", title: "T" }] }, error: null } as never);
    queue.items = [[{ id: "t1" }]]; // template exists; delete + insert resolve from empty queue
    expect(await (await PUT(req(), ctx)).json()).toEqual({ success: true });
  });
});

describe("DELETE .../templates/[templateId]/sections", () => {
  const req = () => new Request("http://x", { method: "DELETE" });

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await DELETE(req(), ctx)).status).toBe(403);
  });

  it("returns 404 when the template is missing", async () => {
    queue.items = [[]];
    expect((await DELETE(req(), ctx)).status).toBe(404);
  });

  it("deletes the template and returns success", async () => {
    queue.items = [[{ id: "t1" }]];
    expect(await (await DELETE(req(), ctx)).json()).toEqual({ success: true });
  });
});
