import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn(),
  hasMinRole: vi.fn().mockReturnValue(false),
  coerceMemberRole: vi.fn().mockReturnValue("MEMBER"),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x/api/churches/c1/availability", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST availability — USE_ROLE_SLOTS_MODEL=false (default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireChurchRole as any).mockResolvedValue({
      user: { id: "u1" },
      membership: { role: "MEMBER" },
      error: null,
    });
  });

  it("returns 400 when serviceId is missing", async () => {
    const res = await POST(makeReq({ status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(400);
  });

  it("upserts availability when service exists", async () => {
    const upsertMock = vi.fn().mockResolvedValue(undefined);
    (db.select as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
        }),
      });
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: upsertMock,
      }),
    });
    const res = await POST(makeReq({ serviceId: "s1", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("POST availability — USE_ROLE_SLOTS_MODEL=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_ROLE_SLOTS_MODEL = "true";
    (requireChurchRole as any).mockResolvedValue({
      user: { id: "u1" },
      membership: { role: "MEMBER" },
      error: null,
    });
  });
  afterEach(() => {
    delete process.env.USE_ROLE_SLOTS_MODEL;
  });

  it("returns 403 NO_ELIGIBLE_ROLE when no eligible role slot exists", async () => {
    // First select: service lookup returns service
    // Second select: eligibility join returns empty
    (db.select as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
          }),
        }),
      });
    const res = await POST(makeReq({ serviceId: "s1", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("NO_ELIGIBLE_ROLE");
  });

  it("allows availability update when user has an eligible role", async () => {
    const upsertMock = vi.fn().mockResolvedValue(undefined);
    // First select: service lookup
    // Second select: eligibility join returns one eligible slot
    (db.select as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: () => Promise.resolve([{ id: "slot1" }]) }),
          }),
        }),
      });
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: upsertMock,
      }),
    });
    const res = await POST(makeReq({ serviceId: "s1", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
