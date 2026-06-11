import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ services: {}, serviceTypeEnum: { enumValues: ["SUNG_EUCHARIST", "EVENSONG"] } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/db/queries/liturgical-days", () => ({ ensureLiturgicalDay: vi.fn() }));
vi.mock("../_write-cell", () => ({ writeCell: vi.fn(), MAX_CELL_TEXT_LEN: 500 }));

const { state } = vi.hoisted(() => ({ state: { tx: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { transaction: (...a: unknown[]) => state.tx(...a) } }));

import { PATCH } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
function patch(body: unknown) {
  vi.mocked(parseJsonBody).mockResolvedValue({ data: body, error: null } as never);
  return new NextRequest("http://x/api/churches/c1/planning/cell", { method: "PATCH" });
}
const cell = { serviceId: "s1", column: "GRADUAL_HYMN", value: { text: "x" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  state.tx.mockResolvedValue({ status: 200, serviceId: "s1", updatedAt: new Date("2026-01-01") });
});

describe("PATCH /api/churches/[churchId]/planning/cell", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PATCH(patch(cell), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PATCH(new NextRequest("http://x", { method: "PATCH" }), ctx)).status).toBe(400);
  });

  it("returns 400 when neither serviceId nor ghost is given", async () => {
    const res = await PATCH(patch({ column: "GRADUAL_HYMN", value: { text: "x" } }), ctx);
    expect(res.status).toBe(400);
    expect(state.tx).not.toHaveBeenCalled();
  });

  it("returns 404 when the transaction reports the service is missing", async () => {
    state.tx.mockResolvedValue({ status: 404 });
    expect((await PATCH(patch(cell), ctx)).status).toBe(404);
  });

  it("returns 409 on a stale optimistic-concurrency conflict", async () => {
    state.tx.mockResolvedValue({ status: 409 });
    const res = await PATCH(patch(cell), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).conflict).toBe(true);
  });

  it("returns the new serviceId and updatedAt on success", async () => {
    const res = await PATCH(patch(cell), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).serviceId).toBe("s1");
  });

  it("returns 500 when the transaction throws", async () => {
    state.tx.mockRejectedValue(new Error("db down"));
    expect((await PATCH(patch(cell), ctx)).status).toBe(500);
  });
});
