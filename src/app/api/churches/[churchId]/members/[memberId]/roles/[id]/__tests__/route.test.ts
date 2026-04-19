import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { delete: vi.fn(), transaction: vi.fn() } }));

import { DELETE, PATCH } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("DELETE /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when non-admin", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(403);
  });

  it("deletes and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.delete as any).mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([{ id: "r1" }]) }),
    });
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when non-admin", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ isPrimary: true }), headers: { "content-type": "application/json" } }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(403);
  });

  it("updates isPrimary and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const updated = { id: "r1", isPrimary: true };
    (db.transaction as any).mockImplementation(async (fn: any) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }) }),
    }));
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ isPrimary: true }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isPrimary).toBe(true);
  });
});
