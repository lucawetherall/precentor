import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x/api/churches/c1/rota", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST rota — USE_ROLE_SLOTS_MODEL=false (default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireChurchRole as any).mockResolvedValue({ user: { id: "editor1" }, error: null });
  });

  it("returns 403 for non-editors", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when userId is missing", async () => {
    const res = await POST(makeReq({ serviceId: "s1", confirmed: true }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(400);
  });

  it("inserts rota entry when service and membership found", async () => {
    const upsertMock = vi.fn().mockResolvedValue(undefined);
    (db.select as any)
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "s1" }]) }) }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "m1" }]) }) }),
      });
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: upsertMock,
      }),
    });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("POST rota — USE_ROLE_SLOTS_MODEL=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_ROLE_SLOTS_MODEL = "true";
    (requireChurchRole as any).mockResolvedValue({ user: { id: "editor1" }, error: null });
  });
  afterEach(() => {
    delete process.env.USE_ROLE_SLOTS_MODEL;
  });

  it("returns 400 missing catalogRoleId", async () => {
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("returns 403 USER_LACKS_ROLE when member doesn't hold the role", async () => {
    (db.select as any)
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("USER_LACKS_ROLE");
  });

  it("returns 404 SLOT_NOT_ON_SERVICE when slot doesn't exist for service", async () => {
    (db.select as any)
      // memberRole found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "mr1" }]) }) }),
      })
      // slot not found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("SLOT_NOT_ON_SERVICE");
  });

  it("returns 409 SLOT_ALREADY_FILLED for exclusive slot that is occupied", async () => {
    (db.select as any)
      // memberRole found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "mr1" }]) }) }),
      })
      // slot found: exclusive, maxCount null
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1", exclusive: true, maxCount: null }]) }) }),
      })
      // existing entries: one exists
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ id: "re1" }]) }),
      });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("SLOT_ALREADY_FILLED");
  });

  it("returns 409 SLOT_AT_CAPACITY when maxCount reached", async () => {
    (db.select as any)
      // memberRole found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "mr1" }]) }) }),
      })
      // slot found: not exclusive, maxCount=2
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1", exclusive: false, maxCount: 2 }]) }) }),
      })
      // existing entries: 2 exist
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ id: "re1" }, { id: "re2" }]) }),
      });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("SLOT_AT_CAPACITY");
  });

  it("returns 201 with warnings:[] on first assignment", async () => {
    const insertMock = vi.fn().mockResolvedValue(undefined);
    (db.select as any)
      // memberRole found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "mr1" }]) }) }),
      })
      // slot found: not exclusive, no maxCount
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1", exclusive: false, maxCount: null }]) }) }),
      })
      // existing entries for capacity check: empty
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([]) }),
      })
      // allSlots for DUAL_ROLE check: only one (the new one)
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([{ id: "re-new", catalogRoleId: "r1" }]) }),
      });
    (db.insert as any).mockReturnValue({
      values: insertMock,
    });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.warnings).toEqual([]);
  });

  it("returns 201 with DUAL_ROLE warning when user already on service in another role", async () => {
    const insertMock = vi.fn().mockResolvedValue(undefined);
    (db.select as any)
      // memberRole found
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "mr1" }]) }) }),
      })
      // slot found: not exclusive, no maxCount
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "sl1", exclusive: false, maxCount: null }]) }) }),
      })
      // existing entries for capacity check: empty
      .mockReturnValueOnce({
        from: () => ({ where: () => Promise.resolve([]) }),
      })
      // allSlots for DUAL_ROLE check: two entries (user already had one other role)
      .mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([
            { id: "re-old", catalogRoleId: "r2" },
            { id: "re-new", catalogRoleId: "r1" },
          ]),
        }),
      });
    (db.insert as any).mockReturnValue({
      values: insertMock,
    });
    const res = await POST(makeReq({ userId: "u1", serviceId: "s1", confirmed: true, catalogRoleId: "r1" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.warnings).toHaveLength(1);
    expect(json.warnings[0].code).toBe("DUAL_ROLE");
    expect(json.warnings[0].allHeldSlots).toHaveLength(2);
  });
});
