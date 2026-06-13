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
    } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
  });

  it("returns 400 when serviceId is missing", async () => {
    const res = await POST(makeReq({ status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(400);
  });

  it("allows a member with no assigned role to set their own availability", async () => {
    // Availability is not role-gated: a freshly-invited chorister with no voice
    // part yet must still be able to submit their availability.
    const upsertMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.select).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ id: "s1", churchId: "c1" }]) }),
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
    expect(upsertMock).toHaveBeenCalledOnce();
  });

  it("returns 404 when the service is not in this church", async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([]) }),
      }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await POST(makeReq({ serviceId: "other-church-svc", status: "AVAILABLE" }), {
      params: Promise.resolve({ churchId: "c1" }),
    });
    expect(res.status).toBe(404);
  });
});
