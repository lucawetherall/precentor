import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }));

import { GET, POST } from "../role-slots";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

const validSlotBody = {
  catalogRoleId: "550e8400-e29b-41d4-a716-446655440001",
  minCount: 1,
  maxCount: 4,
  exclusive: false,
  displayOrder: 10,
};

describe("GET /api/churches/[churchId]/services/[serviceId]/role-slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-members", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when service not found", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("returns role slots for service", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const slots = [{ id: "sl1", serviceId: "s1" }];
    (db.select as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve(slots) }) });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
  });
});

describe("POST /api/churches/[churchId]/services/[serviceId]/role-slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-editors", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify(validSlotBody), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ catalogRoleId: "bad" }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when service not found", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify(validSlotBody), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when role is not rota-eligible", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ rotaEligible: false, category: "CLERGY_PARISH" }]) }) }) });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify(validSlotBody), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("ROLE_NOT_ROTA_ELIGIBLE");
  });

  it("creates slot and returns 201", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }) })
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ rotaEligible: true, category: "MUSIC_DIRECTION" }]) }) }) });
    const created = { id: "sl1" };
    (db.insert as any).mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([created]) }),
    });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify(validSlotBody), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) },
    );
    expect(res.status).toBe(201);
  });
});
