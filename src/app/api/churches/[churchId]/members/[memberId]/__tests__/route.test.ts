import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ churchMemberships: { id: {}, churchId: {}, role: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn() }));

const transaction = vi.fn();
vi.mock("@/lib/db", () => ({ db: { transaction: (...a: unknown[]) => transaction(...a) } }));

import { PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";

const ctx = { params: Promise.resolve({ churchId: "c1", memberId: "m1" }) };
const okAuth = { error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>;
const forbidden = { error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>;
function patchBody(role?: string) {
  return new Request("http://x", { method: "PATCH", body: JSON.stringify({ role }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue(okAuth);
  vi.mocked(parseJsonBody).mockResolvedValue({ data: { role: "MEMBER" }, error: null } as never);
});

describe("PATCH /api/churches/[churchId]/members/[memberId]", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue(forbidden);
    expect((await PATCH(patchBody("MEMBER"), ctx)).status).toBe(403);
  });

  it("returns 400 when the body has no updatable fields", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: {}, error: null } as never);
    const res = await PATCH(patchBody(), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/No valid fields/);
  });

  it("returns 400 when demoting the last admin", async () => {
    transaction.mockResolvedValue({ lastAdmin: true });
    const res = await PATCH(patchBody("MEMBER"), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/last admin/i);
  });

  it("returns 404 when the member does not exist", async () => {
    transaction.mockResolvedValue({ lastAdmin: false, rows: [] });
    expect((await PATCH(patchBody("MEMBER"), ctx)).status).toBe(404);
  });

  it("returns the updated membership on success", async () => {
    transaction.mockResolvedValue({ lastAdmin: false, rows: [{ id: "m1", role: "MEMBER" }] });
    const res = await PATCH(patchBody("MEMBER"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "m1", role: "MEMBER" });
  });

  it("returns 500 when the transaction throws", async () => {
    transaction.mockRejectedValue(new Error("db down"));
    expect((await PATCH(patchBody("MEMBER"), ctx)).status).toBe(500);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PATCH(patchBody("WIZARD"), ctx)).status).toBe(400);
  });
});

describe("DELETE /api/churches/[churchId]/members/[memberId]", () => {
  function delReq() {
    return new Request("http://x", { method: "DELETE" });
  }

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue(forbidden);
    expect((await DELETE(delReq(), ctx)).status).toBe(403);
  });

  it("returns 400 when removing the last admin", async () => {
    transaction.mockResolvedValue({ lastAdmin: true });
    expect((await DELETE(delReq(), ctx)).status).toBe(400);
  });

  it("returns 404 when the member does not exist", async () => {
    transaction.mockResolvedValue({ lastAdmin: false, rows: [] });
    expect((await DELETE(delReq(), ctx)).status).toBe(404);
  });

  it("returns success when a member is removed", async () => {
    transaction.mockResolvedValue({ lastAdmin: false, rows: [{ id: "m1" }] });
    const res = await DELETE(delReq(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 500 when the transaction throws", async () => {
    transaction.mockRejectedValue(new Error("db down"));
    expect((await DELETE(delReq(), ctx)).status).toBe(500);
  });
});
