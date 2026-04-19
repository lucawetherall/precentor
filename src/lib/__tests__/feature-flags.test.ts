import { describe, it, expect, beforeEach } from "vitest";
import { useRoleSlotsModel } from "../feature-flags";

describe("useRoleSlotsModel", () => {
  const orig = process.env.USE_ROLE_SLOTS_MODEL;
  beforeEach(() => { process.env.USE_ROLE_SLOTS_MODEL = orig; });

  it("returns false by default", () => {
    delete process.env.USE_ROLE_SLOTS_MODEL;
    expect(useRoleSlotsModel()).toBe(false);
  });
  it("returns true when env var is 'true'", () => {
    process.env.USE_ROLE_SLOTS_MODEL = "true";
    expect(useRoleSlotsModel()).toBe(true);
  });
  it("returns false for any other value", () => {
    process.env.USE_ROLE_SLOTS_MODEL = "yes";
    expect(useRoleSlotsModel()).toBe(false);
  });
});
