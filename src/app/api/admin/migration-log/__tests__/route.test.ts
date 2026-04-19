import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/super-admin", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }));

import { GET } from "../route";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";

describe("GET /api/admin/migration-log", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when env allowlist is empty (no super-admin)", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      user: null,
      error: new Response(JSON.stringify({ error: "Super-admin only", code: "FORBIDDEN" }), { status: 403 }),
    } as unknown as Awaited<ReturnType<typeof requireSuperAdmin>>);
    const res = await GET(new Request("http://x/api/admin/migration-log"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when email not in allowlist", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      user: null,
      error: new Response(JSON.stringify({ error: "Super-admin only", code: "FORBIDDEN" }), { status: 403 }),
    } as unknown as Awaited<ReturnType<typeof requireSuperAdmin>>);
    const res = await GET(new Request("http://x/api/admin/migration-log"));
    expect(res.status).toBe(403);
  });

  it("returns 200 with log rows when super-admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ user: { id: "u1", email: "admin@example.com" }, error: null } as unknown as Awaited<ReturnType<typeof requireSuperAdmin>>);
    const rows = [{ id: "l1", severity: "WARN", code: "MEMBER_NO_VOICE_PART" }];
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => ({ orderBy: () => Promise.resolve(rows) }),
      }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x/api/admin/migration-log"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("l1");
  });

  it("passes filters as query params", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ user: { id: "u1", email: "admin@example.com" }, error: null } as unknown as Awaited<ReturnType<typeof requireSuperAdmin>>);
    vi.mocked(db.select).mockReturnValue({
      from: () => ({
        where: () => ({ orderBy: () => Promise.resolve([]) }),
      }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x/api/admin/migration-log?severity=ERROR&includeDismissed=true"));
    expect(res.status).toBe(200);
  });
});
