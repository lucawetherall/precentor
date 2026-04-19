import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./permissions", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireAuth: vi.fn() }));

import { requireSuperAdmin } from "../super-admin";
import { requireAuth } from "@/lib/auth/permissions";

describe("requireSuperAdmin", () => {
  const originalEnv = process.env.SUPER_ADMIN_EMAILS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalEnv;
    }
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: null,
      error: new Response("Unauthorized", { status: 401 }),
    });
    const result = await requireSuperAdmin();
    expect(result.error).toBeTruthy();
    expect((result.error as Response).status).toBe(401);
  });

  it("returns 403 when env allowlist is empty", async () => {
    process.env.SUPER_ADMIN_EMAILS = "";
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", email: "user@example.com" },
      error: null,
    });
    const result = await requireSuperAdmin();
    expect(result.error).toBeTruthy();
    expect((result.error as Response).status).toBe(403);
  });

  it("returns 403 when user email is not in allowlist", async () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com,other@example.com";
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", email: "notadmin@example.com" },
      error: null,
    });
    const result = await requireSuperAdmin();
    expect(result.error).toBeTruthy();
    expect((result.error as Response).status).toBe(403);
  });

  it("returns user when email is in allowlist", async () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com,other@example.com";
    const user = { id: "u1", email: "admin@example.com" };
    vi.mocked(requireAuth).mockResolvedValue({ user, error: null });
    const result = await requireSuperAdmin();
    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
  });

  it("trims whitespace from allowlist entries", async () => {
    process.env.SUPER_ADMIN_EMAILS = " admin@example.com , other@example.com ";
    const user = { id: "u1", email: "admin@example.com" };
    vi.mocked(requireAuth).mockResolvedValue({ user, error: null });
    const result = await requireSuperAdmin();
    expect(result.error).toBeNull();
  });
});
