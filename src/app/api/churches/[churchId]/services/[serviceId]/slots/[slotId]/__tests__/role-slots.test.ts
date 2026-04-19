import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { PATCH, DELETE } from "../role-slots";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("PATCH /services/[serviceId]/slots/[slotId] (role slot)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-editors", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: -1 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when slot not found", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.update as any).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    });
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("updates and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const updated = { id: "sl1", minCount: 2 };
    (db.update as any).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }),
    });
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).minCount).toBe(2);
  });
});

describe("DELETE /services/[serviceId]/slots/[slotId] (role slot)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-editors", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await DELETE(
      new Request("http://x"),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("deletes slot and quarantines rota entries, returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.transaction as any).mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      await fn({
        select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ catalogRoleId: "r1" }]) }) }) }),
        update: vi.fn().mockReturnValue({ set: () => ({ where: () => Promise.resolve() }) }),
        delete: vi.fn().mockReturnValue({ where: () => Promise.resolve() }),
      });
    });
    const res = await DELETE(
      new Request("http://x"),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(200);
  });
});
