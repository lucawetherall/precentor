import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { delete: vi.fn(), transaction: vi.fn() } }));

import { DELETE, PATCH } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("DELETE /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when non-admin", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(403);
  });

  it("deletes and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    vi.mocked(db.delete).mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([{ id: "r1" }]) }),
    } as unknown as ReturnType<typeof db.delete>);
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when non-admin", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ isPrimary: true }), headers: { "content-type": "application/json" } }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(403);
  });

  it("updates isPrimary and returns 200", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null } as unknown as Awaited<ReturnType<typeof requireChurchRole>>);
    const updated = { id: "r1", isPrimary: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn({
      update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }) }),
    }));
    const res = await PATCH(
      new Request("http://x", { method: "PATCH", body: JSON.stringify({ isPrimary: true }), headers: { "content-type": "application/json" } }),
      { params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isPrimary).toBe(true);
  });
});
