import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() } }));

import { GET, PATCH, DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("GET /api/churches/[churchId]/presets/[presetId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(404);
  });

  it("returns preset with slots on 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const preset = { id: "p1", name: "Choral" };
    const slots = [{ id: "s1" }];
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([preset]) }) }) } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve(slots) }) } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.slots).toHaveLength(1);
  });
});

describe("PATCH /api/churches/[churchId]/presets/[presetId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const updated = { id: "p1", name: "Updated" };
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }),
    } as unknown as ReturnType<typeof db.update>);
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ name: "Updated" }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Updated");
  });
});

describe("DELETE /api/churches/[churchId]/presets/[presetId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 409 when referenced by services", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    // First select (patterns) returns count 1
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }) } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) } as unknown as ReturnType<typeof db.select>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(409);
  });

  it("deletes when not referenced", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.delete).mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([{ id: "p1" }]) }),
    } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(200);
  });
});
