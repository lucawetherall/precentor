import { describe, it, expect, vi, beforeEach } from "vitest";

// Make `redirect()` throw a sentinel error so we can assert which path it
// was called with — this matches Next.js's actual behaviour, where redirect
// throws NEXT_REDIRECT to halt rendering.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/permissions", () => ({
  getAuthUser: vi.fn(),
  getChurchMembership: vi.fn(),
  hasMinRole: vi.fn(),
  coerceMemberRole: vi.fn((v: string) => v),
}));

import { requirePageAuth } from "../page-auth";
import {
  getAuthUser,
  getChurchMembership,
  hasMinRole,
} from "@/lib/auth/permissions";

const mockGetAuthUser = vi.mocked(getAuthUser);
const mockGetChurchMembership = vi.mocked(getChurchMembership);
const mockHasMinRole = vi.mocked(hasMinRole);

const fakeUser = { id: "user-1", supabaseId: "sb-1", email: "a@b.c", name: "A" } as Awaited<ReturnType<typeof getAuthUser>>;
const fakeMembership = { id: "m-1", userId: "user-1", churchId: "ch-1", role: "ADMIN" } as Awaited<ReturnType<typeof getChurchMembership>>;

describe("requirePageAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when no auth user", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    await expect(requirePageAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("returns user with null membership when no churchId is supplied and user is authenticated", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);

    const result = await requirePageAuth();
    expect(result.user).toEqual(fakeUser);
    expect(result.membership).toBeNull();
    expect(mockGetChurchMembership).not.toHaveBeenCalled();
  });

  it("redirects to /churches when churchId provided but user has no membership", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);
    // getChurchMembership returns `T | null` at runtime; the type-inferred
    // mock signature drops the null, hence the cast.
    mockGetChurchMembership.mockResolvedValue(null as unknown as NonNullable<typeof fakeMembership>);

    await expect(requirePageAuth({ churchId: "ch-1" })).rejects.toThrow(
      "NEXT_REDIRECT:/churches",
    );
  });

  it("returns user and membership when churchId matches and no role is required", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);
    mockGetChurchMembership.mockResolvedValue(fakeMembership);

    const result = await requirePageAuth({ churchId: "ch-1" });
    expect(result.user).toEqual(fakeUser);
    expect(result.membership).toEqual(fakeMembership);
  });

  it("redirects to /churches/{id} when role gate is below required", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);
    mockGetChurchMembership.mockResolvedValue(fakeMembership);
    mockHasMinRole.mockReturnValue(false);

    await expect(
      requirePageAuth({ churchId: "ch-1", role: "ADMIN" }),
    ).rejects.toThrow("NEXT_REDIRECT:/churches/ch-1");
  });

  it("returns user and membership when role gate passes", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);
    mockGetChurchMembership.mockResolvedValue(fakeMembership);
    mockHasMinRole.mockReturnValue(true);

    const result = await requirePageAuth({ churchId: "ch-1", role: "ADMIN" });
    expect(result.user).toEqual(fakeUser);
    expect(result.membership).toEqual(fakeMembership);
    expect(mockHasMinRole).toHaveBeenCalledWith("ADMIN", "ADMIN");
  });

  it("does not check role when only churchId is provided", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);
    mockGetChurchMembership.mockResolvedValue(fakeMembership);

    await requirePageAuth({ churchId: "ch-1" });
    expect(mockHasMinRole).not.toHaveBeenCalled();
  });

  it("ignores role when no churchId is provided", async () => {
    mockGetAuthUser.mockResolvedValue(fakeUser);

    // role without churchId is meaningless and should be a no-op (membership
    // is null, no role check possible).
    const result = await requirePageAuth({ role: "ADMIN" });
    expect(result.user).toEqual(fakeUser);
    expect(result.membership).toBeNull();
    expect(mockGetChurchMembership).not.toHaveBeenCalled();
    expect(mockHasMinRole).not.toHaveBeenCalled();
  });
});
