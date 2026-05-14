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
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: -1 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when service does not belong to church", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when slot not found", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.update>);
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ minCount: 2 }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("updates and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const updated = { id: "sl1", minCount: 2 };
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }),
    } as unknown as ReturnType<typeof db.update>);
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
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await DELETE(
      new Request("http://x"),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("deletes slot and quarantines rota entries, returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn({
      select: vi.fn()
        // ownership check returns the service
        .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }) })
        // slot lookup returns the slot
        .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ catalogRoleId: "r1" }]) }) }) }),
      update: vi.fn().mockReturnValue({ set: () => ({ where: () => Promise.resolve() }) }),
      delete: vi.fn().mockReturnValue({ where: () => Promise.resolve() }),
    }));
    const res = await DELETE(
      new Request("http://x"),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1", slotId: "sl1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("silently noops when service belongs to another church", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const deleteSpy = vi.fn().mockReturnValue({ where: () => Promise.resolve() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn({
      // ownership check returns empty
      select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
      update: vi.fn(),
      delete: deleteSpy,
    }));
    const res = await DELETE(
      new Request("http://x"),
      { params: Promise.resolve({ churchId: "c1", serviceId: "other-church-svc", slotId: "sl1" }) },
    );
    expect(res.status).toBe(200);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
