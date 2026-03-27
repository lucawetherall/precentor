import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges basic classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("resolves conflicting Tailwind classes to the last one", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("accepts array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("accepts object inputs", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });
});
