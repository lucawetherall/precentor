import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ users: { id: {} }, churchMemberships: { userId: {}, churchId: {} }, userDeletions: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

const deleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ auth: { admin: { deleteUser } } }) }));

const { state } = vi.hoisted(() => ({ state: { memberships: [] as unknown[], tx: vi.fn() } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => Promise.resolve(state.memberships);
  return { db: { select: () => chain, transaction: (...a: unknown[]) => state.tx(...a) } };
});

import { DELETE } from "../route";
import { requireAuth } from "@/lib/auth/permissions";

const authUser = { user: { id: "u1", supabaseId: "sup-1" }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(authUser as never);
  state.memberships = [{ churchId: "c1" }];
  state.tx.mockResolvedValue(undefined);
  deleteUser.mockResolvedValue({ error: null });
});

describe("DELETE /api/user", () => {
  it("returns the auth error when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ error: new Response("no", { status: 401 }) } as never);
    expect((await DELETE()).status).toBe(401);
  });

  it("returns 502 and skips the DB delete when Supabase auth deletion fails", async () => {
    deleteUser.mockResolvedValue({ error: { message: "supabase down" } });
    const res = await DELETE();
    expect(res.status).toBe(502);
    expect(state.tx).not.toHaveBeenCalled();
  });

  it("deletes auth then cascades the DB rows and returns success", async () => {
    const res = await DELETE();
    expect(deleteUser).toHaveBeenCalledWith("sup-1");
    expect(state.tx).toHaveBeenCalledOnce();
    expect(await res.json()).toEqual({ success: true });
  });

  it("still reports success when the DB delete fails after auth is gone", async () => {
    state.tx.mockRejectedValue(new Error("db down"));
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
