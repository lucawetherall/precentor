import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({
  users: {},
  churchMemberships: {},
}));

import { coerceMemberRole, isMemberRole, VALID_MEMBER_ROLES } from "@/lib/auth/permissions";

describe("isMemberRole", () => {
  it("returns true for each valid role", () => {
    for (const role of VALID_MEMBER_ROLES) {
      expect(isMemberRole(role)).toBe(true);
    }
  });

  it("returns false for unknown strings", () => {
    expect(isMemberRole("SUPERADMIN")).toBe(false);
    expect(isMemberRole("admin")).toBe(false); // case-sensitive
    expect(isMemberRole("")).toBe(false);
  });

  it("returns false for non-string inputs", () => {
    expect(isMemberRole(null)).toBe(false);
    expect(isMemberRole(undefined)).toBe(false);
    expect(isMemberRole(0)).toBe(false);
    expect(isMemberRole({})).toBe(false);
  });
});

describe("coerceMemberRole", () => {
  const originalWarn = console.warn;
  beforeEach(() => {
    console.warn = vi.fn();
  });
  afterEach(() => {
    console.warn = originalWarn;
  });

  it("passes through valid roles unchanged", () => {
    expect(coerceMemberRole("ADMIN")).toBe("ADMIN");
    expect(coerceMemberRole("EDITOR")).toBe("EDITOR");
    expect(coerceMemberRole("MEMBER")).toBe("MEMBER");
  });

  it("defaults to MEMBER and warns when value is unknown", () => {
    expect(coerceMemberRole("SUPERADMIN")).toBe("MEMBER");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("defaults to MEMBER for null/undefined without throwing", () => {
    expect(coerceMemberRole(null)).toBe("MEMBER");
    expect(coerceMemberRole(undefined)).toBe("MEMBER");
  });

  it("is case-sensitive — lowercase 'admin' falls back to MEMBER", () => {
    // Guards against accidentally widening the type via string-normalisation.
    expect(coerceMemberRole("admin")).toBe("MEMBER");
  });
});
