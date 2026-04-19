import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() } }));

import { PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("PATCH /presets/[presetId]/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(403);
  });

  it("updates and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const updated = { id: "sl1", minCount: 2 };
    vi.mocked(db.select).mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1" }]) }) }) }) } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.update).mockReturnValue({ set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }) } as unknown as ReturnType<typeof db.update>);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /presets/[presetId]/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.delete).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([{ id: "sl1" }]) }) } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.delete).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([]) }) } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(404);
  });
});
