import { describe, it, expect } from "vitest";
import { passwordSchema } from "../schemas";

// Regression suite for the password policy tightened during production-readiness
// review — the previous policy accepted trivially patterned inputs like
// `password1111111111`, which hit 10 chars and two character classes.
describe("passwordSchema", () => {
  it.each([
    ["CorrectHorseBattery1", "three classes, mixed"],
    ["Tr0ub4dor&3Tr0", "four classes"],
    ["MyStrongPass99", "upper + lower + digit"],
  ])("accepts %p (%s)", (input) => {
    expect(passwordSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["short1A!", "under 10 chars"],
    ["password1111111111", "only two classes — previous policy accepted this"],
    ["aaaaaaaaaa", "repeats same char 10 times"],
    ["password123", "only two classes + deny-list"],
    ["1111111111", "deny-list"],
  ])("rejects %p (%s)", (input) => {
    expect(passwordSchema.safeParse(input).success).toBe(false);
  });
});
