import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({
  users: {},
  churchMemberships: {},
}));

import { hasMinRole } from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";

describe("hasMinRole", () => {
  const roles: MemberRole[] = ["ADMIN", "EDITOR", "MEMBER"];

  it("exhaustive 3x3 matrix - all 9 combinations verified", () => {
    // ADMIN >= ADMIN, EDITOR, MEMBER
    expect(hasMinRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasMinRole("ADMIN", "EDITOR")).toBe(true);
    expect(hasMinRole("ADMIN", "MEMBER")).toBe(true);

    // EDITOR >= EDITOR, MEMBER but not ADMIN
    expect(hasMinRole("EDITOR", "ADMIN")).toBe(false);
    expect(hasMinRole("EDITOR", "EDITOR")).toBe(true);
    expect(hasMinRole("EDITOR", "MEMBER")).toBe(true);

    // MEMBER >= MEMBER but not EDITOR or ADMIN
    expect(hasMinRole("MEMBER", "ADMIN")).toBe(false);
    expect(hasMinRole("MEMBER", "EDITOR")).toBe(false);
    expect(hasMinRole("MEMBER", "MEMBER")).toBe(true);
  });

  it("verifies asymmetry: ADMIN >= MEMBER is true, MEMBER >= ADMIN is false", () => {
    expect(hasMinRole("ADMIN", "MEMBER")).toBe(true);
    expect(hasMinRole("MEMBER", "ADMIN")).toBe(false);
  });

  it("every role has min role of itself (reflexive)", () => {
    for (const role of roles) {
      expect(hasMinRole(role, role)).toBe(true);
    }
  });
});
