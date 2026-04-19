import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));
vi.mock("@/lib/services/template-resolution", () => ({
  resolveTemplateSections: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x/api/churches/c1/services", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/churches/[churchId]/services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(makeReq({ liturgicalDayId: "d1", serviceType: "SUNG_EUCHARIST" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("creates a service without presetId and returns 201", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const created = { id: "svc1", churchId: "c1", liturgicalDayId: "d1", serviceType: "SUNG_EUCHARIST" };
    vi.mocked(db.transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: () => ({ returning: () => Promise.resolve([created]) }),
        }),
      };
      return fn(tx);
    });
    const res = await POST(makeReq({ liturgicalDayId: "d1", serviceType: "SUNG_EUCHARIST" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("svc1");
  });

  it("snapshots preset slots when presetId is provided", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const created = { id: "svc1", churchId: "c1", liturgicalDayId: "d1", serviceType: "SUNG_EUCHARIST", presetId: "p1" };
    const insertMock = vi.fn();
    const presetSlots = [
      { id: "psl1", catalogRoleId: "r1", minCount: 1, maxCount: 4, exclusive: false, displayOrder: 0 },
    ];
    vi.mocked(db.transaction).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: insertMock.mockReturnValue({
          values: vi.fn().mockReturnValue({ returning: () => Promise.resolve([created]) }),
        }),
        select: vi.fn()
          .mockReturnValueOnce({ from: () => ({ where: () => Promise.resolve(presetSlots) }) }),
      };
      return fn(tx);
    });
    const res = await POST(makeReq({ liturgicalDayId: "d1", serviceType: "SUNG_EUCHARIST", presetId: "p1" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(201);
    // insert should have been called at least twice (service + role slots)
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
