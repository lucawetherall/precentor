import { describe, it, expect } from "vitest";
import { isPublicPath, PUBLIC_PATHS } from "@/lib/auth/public-paths";

describe("isPublicPath", () => {
  describe("PUBLIC_PATHS", () => {
    it.each(PUBLIC_PATHS)("returns true for %s", (path) => {
      expect(isPublicPath(path)).toBe(true);
    });
  });

  describe("auth paths", () => {
    it("returns true for paths starting with /auth", () => {
      expect(isPublicPath("/auth")).toBe(true);
    });

    it("returns true for deeply nested auth paths", () => {
      expect(isPublicPath("/auth/callback/something")).toBe(true);
    });
  });

  describe("invite paths", () => {
    it("returns true for paths starting with /invite/", () => {
      expect(isPublicPath("/invite/abc123")).toBe(true);
    });

    it("returns true for deeply nested invite paths", () => {
      expect(isPublicPath("/invite/abc123/extra")).toBe(true);
    });
  });

  describe("API invites paths", () => {
    it("returns true for /api/invites/ paths", () => {
      expect(isPublicPath("/api/invites/token123")).toBe(true);
    });
  });

  describe("protected paths", () => {
    it("returns false for /dashboard", () => {
      expect(isPublicPath("/dashboard")).toBe(false);
    });

    it("returns false for /churches", () => {
      expect(isPublicPath("/churches")).toBe(false);
    });

    it("returns false for /onboarding", () => {
      expect(isPublicPath("/onboarding")).toBe(false);
    });

    it("returns false for non-matching API paths", () => {
      expect(isPublicPath("/api/churches")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty string", () => {
      expect(isPublicPath("")).toBe(false);
    });

    it("returns false for path with trailing slash", () => {
      expect(isPublicPath("/login/")).toBe(false);
    });

    it("returns false for path with query string", () => {
      expect(isPublicPath("/login?next=/dashboard")).toBe(false);
    });

    it("is case-sensitive (/Login should be false)", () => {
      expect(isPublicPath("/Login")).toBe(false);
    });
  });
});
