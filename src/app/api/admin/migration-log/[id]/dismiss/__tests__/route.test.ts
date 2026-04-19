import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/super-admin", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { update: vi.fn() } }));

import { POST } from "../route";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";

describe("POST /api/admin/migration-log/[id]/dismiss", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 without super-admin access", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      user: null,
      error: new Response(JSON.stringify({ error: "Super-admin only", code: "FORBIDDEN" }), { status: 403 }),
    });
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ id: "log1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when log entry not found", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ user: { id: "u1", email: "admin@example.com" }, error: null });
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.update>);
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("dismisses log entry and returns 200", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ user: { id: "u1", email: "admin@example.com" }, error: null });
    const updated = { id: "log1", dismissedAt: new Date().toISOString() };
    vi.mocked(db.update).mockReturnValue({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([updated]) }) }),
    } as unknown as ReturnType<typeof db.update>);
    const res = await POST(new Request("http://x"), { params: Promise.resolve({ id: "log1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("log1");
  });
});
