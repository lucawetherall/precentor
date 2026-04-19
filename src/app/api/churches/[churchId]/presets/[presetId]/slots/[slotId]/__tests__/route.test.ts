import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() } }));

import { PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("PATCH /presets/[presetId]/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(403);
  });

  it("updates and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const updated = { id: "sl1", minCount: 2 };
    (db.select as any).mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1" }]) }) }) }) });
    (db.update as any).mockReturnValue({ set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }) });
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /presets/[presetId]/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.delete as any).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([{ id: "sl1" }]) }) });
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.delete as any).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([]) }) });
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(404);
  });
});
