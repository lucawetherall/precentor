import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("POST /api/churches/[churchId]/services/[serviceId]/slots/restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-editors", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when service not found", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when service has no preset", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1", presetId: null }]) }) }),
    });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(409);
  });

  it("restores slots from preset and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.select as any).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1", presetId: "p1" }]) }) }),
    });
    (db.transaction as any).mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      await fn({
        delete: vi.fn().mockReturnValue({ where: () => Promise.resolve() }),
        select: vi.fn().mockReturnValue({ from: () => ({ where: () => Promise.resolve([{ id: "psl1", catalogRoleId: "r1", minCount: 1, maxCount: 4, exclusive: false, displayOrder: 0 }]) }) }),
        insert: vi.fn().mockReturnValue({ values: () => Promise.resolve() }),
      });
    });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.restored).toBe(true);
  });
});
