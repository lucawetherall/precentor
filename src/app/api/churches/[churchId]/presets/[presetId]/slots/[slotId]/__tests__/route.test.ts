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

  it("rejects (400) flipping exclusive on when the stored maxCount exceeds 1", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    // Existing slot is non-exclusive with maxCount 5; the PATCH only sets exclusive:true.
    vi.mocked(db.select).mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1", minCount: 0, maxCount: 5, exclusive: false }]) }) }) }) } as unknown as ReturnType<typeof db.select>);
    const updateSpy = vi.fn();
    vi.mocked(db.update).mockReturnValue({ set: updateSpy } as unknown as ReturnType<typeof db.update>);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ exclusive: true }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(400);
    // The merged-state guard must run before any write.
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("returns 404 (not a misleading 200) when the slot is in the church but under a different preset", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    // Existence check passes (slot belongs to this church) ...
    vi.mocked(db.select).mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1" }]) }) }) }) } as unknown as ReturnType<typeof db.select>);
    // ... but the presetId-scoped UPDATE matches no rows.
    vi.mocked(db.update).mockReturnValue({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) } as unknown as ReturnType<typeof db.update>);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /presets/[presetId]/slots/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    // ownership check returns the preset
    vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "p1" }]) }) }) } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.delete).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([{ id: "sl1" }]) }) } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 when preset belongs to another church", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    // ownership check returns empty
    vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) } as unknown as ReturnType<typeof db.select>);
    const deleteSpy = vi.fn().mockReturnValue({ returning: () => Promise.resolve([]) });
    vi.mocked(db.delete).mockReturnValue({ where: deleteSpy } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("returns 404 when slot not found within owned preset", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "p1" }]) }) }) } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.delete).mockReturnValue({ where: () => ({ returning: () => Promise.resolve([]) }) } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1", slotId: "sl1" }) });
    expect(res.status).toBe(404);
  });
});
