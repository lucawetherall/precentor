import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { update: vi.fn() } }));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("POST /api/churches/[churchId]/presets/[presetId]/archive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(403);
  });

  it("archives the preset", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const archived = { id: "p1", archivedAt: new Date().toISOString() };
    (db.update as any).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([archived]) }) }),
    });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ churchId: "c1", presetId: "p1" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("p1");
  });
});
