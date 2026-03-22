import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/db/schema", () => ({
  users: {},
  churchMemberships: {},
}));

import { hasMinRole } from "../permissions";

describe("hasMinRole", () => {
  it("ADMIN has min role of ADMIN", () => {
    expect(hasMinRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("ADMIN has min role of EDITOR", () => {
    expect(hasMinRole("ADMIN", "EDITOR")).toBe(true);
  });

  it("ADMIN has min role of MEMBER", () => {
    expect(hasMinRole("ADMIN", "MEMBER")).toBe(true);
  });

  it("EDITOR does not have min role of ADMIN", () => {
    expect(hasMinRole("EDITOR", "ADMIN")).toBe(false);
  });

  it("EDITOR has min role of EDITOR", () => {
    expect(hasMinRole("EDITOR", "EDITOR")).toBe(true);
  });

  it("EDITOR has min role of MEMBER", () => {
    expect(hasMinRole("EDITOR", "MEMBER")).toBe(true);
  });

  it("MEMBER does not have min role of ADMIN", () => {
    expect(hasMinRole("MEMBER", "ADMIN")).toBe(false);
  });

  it("MEMBER does not have min role of EDITOR", () => {
    expect(hasMinRole("MEMBER", "EDITOR")).toBe(false);
  });

  it("MEMBER has min role of MEMBER", () => {
    expect(hasMinRole("MEMBER", "MEMBER")).toBe(true);
  });
});
