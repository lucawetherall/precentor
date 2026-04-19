import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("POST /api/churches/[churchId]/members/[memberId]/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when caller is not ADMIN", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(makeReq({ catalogRoleId: "550e8400-e29b-41d4-a716-446655440001" }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const res = await POST(makeReq({ catalogRoleId: "not-a-uuid" }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(400);
  });

  it("inserts the assignment and returns 201 with id", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const inserted = { id: "new-id", userId: "m1", churchId: "c1", catalogRoleId: "550e8400-e29b-41d4-a716-446655440001", isPrimary: false, displayOrder: 0 };
    (db.transaction as any).mockImplementation(async (fn: any) => fn({
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ userId: "m1" }]) }) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: () => Promise.resolve([inserted]) }) }) }),
    }));
    const res = await POST(makeReq({ catalogRoleId: "550e8400-e29b-41d4-a716-446655440001", isPrimary: true }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("new-id");
  });
});
