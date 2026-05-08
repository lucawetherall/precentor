import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "../safe-redirect";

describe("safeRedirectPath", () => {
  it("accepts a same-origin absolute path", () => {
    expect(safeRedirectPath("/account")).toBe("/account");
  });

  it("accepts a path with query string and hash", () => {
    expect(safeRedirectPath("/services?date=2026-05-08#top")).toBe(
      "/services?date=2026-05-08#top",
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com/foo")).toBe("/dashboard");
  });

  it("rejects backslash-escaped protocol-relative URLs", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.com/foo")).toBe("/dashboard");
  });

  it("rejects relative paths without leading slash", () => {
    expect(safeRedirectPath("account")).toBe("/dashboard");
    expect(safeRedirectPath("../etc/passwd")).toBe("/dashboard");
  });

  it("rejects null, undefined, and empty string", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("uses the supplied fallback when input is invalid", () => {
    expect(safeRedirectPath(null, "/login")).toBe("/login");
    expect(safeRedirectPath("//evil.com", "/")).toBe("/");
  });

  it("returns valid input even when a fallback is supplied", () => {
    expect(safeRedirectPath("/account", "/login")).toBe("/account");
  });
});
