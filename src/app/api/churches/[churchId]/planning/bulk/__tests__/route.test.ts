import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ services: {}, serviceTypeEnum: { enumValues: ["SUNG_EUCHARIST", "EVENSONG"] } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn(), inArray: vi.fn() }));
vi.mock("@/lib/db/queries/liturgical-days", () => ({ ensureLiturgicalDay: vi.fn() }));
vi.mock("../_write-cell", () => ({ writeCell: vi.fn(), MAX_CELL_TEXT_LEN: 500 }));

const { state } = vi.hoisted(() => ({ state: { tx: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { transaction: (...a: unknown[]) => state.tx(...a) } }));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
function post(body: unknown) {
  vi.mocked(parseJsonBody).mockResolvedValue({ data: body, error: null } as never);
  return new NextRequest("http://x/api/churches/c1/planning/bulk", { method: "POST" });
}
const change = { serviceId: "s1", column: "GRADUAL_HYMN", value: { text: "x" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  state.tx.mockResolvedValue({ written: 1, resolvedGhosts: 0 });
});

describe("POST /api/churches/[churchId]/planning/bulk", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(post({ changes: [change] }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new NextRequest("http://x", { method: "POST" }), ctx)).status).toBe(400);
  });

  it("returns 400 when a change has neither serviceId nor ghost", async () => {
    const res = await POST(post({ changes: [{ column: "GRADUAL_HYMN", value: { text: "x" } }] }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/requires serviceId or ghost/);
    expect(state.tx).not.toHaveBeenCalled();
  });

  it("applies the changes and returns the write summary", async () => {
    const res = await POST(post({ changes: [change] }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ written: 1, resolvedGhosts: 0 });
  });

  it("returns 500 when the transaction throws", async () => {
    state.tx.mockRejectedValue(new Error("db down"));
    expect((await POST(post({ changes: [change] }), ctx)).status).toBe(500);
  });
});
