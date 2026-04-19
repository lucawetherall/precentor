import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("POST availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireChurchRole).mockResolvedValue({
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

  it("returns 403 NO_ELIGIBLE_ROLE when no eligible role slot exists", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
        }),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: () => Promise.resolve([]) }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);
    const res = await POST(makeReq({ serviceId: "s1", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("NO_ELIGIBLE_ROLE");
  });

  it("allows availability update when user has an eligible role", async () => {
    const upsertMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
        }),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({ limit: () => Promise.resolve([{ id: "slot1" }]) }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: upsertMock,
      }),
    } as unknown as ReturnType<typeof db.insert>);
    const res = await POST(makeReq({ serviceId: "s1", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
