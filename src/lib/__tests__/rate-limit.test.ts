import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the rate-limiting logic in isolation by re-importing with a fresh module
// for each test suite to avoid shared state.

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function getRateLimit() {
    const mod = await import("../rate-limit");
    return mod.rateLimit;
  }

  it("allows requests under the limit", async () => {
    const rateLimit = await getRateLimit();
    for (let i = 0; i < 5; i++) {
      const result = rateLimit("test-user", { maxRequests: 5, windowMs: 60_000 });
      expect(result).toBeNull();
    }
  });

  it("blocks requests over the limit", async () => {
    const rateLimit = await getRateLimit();
    for (let i = 0; i < 10; i++) {
      rateLimit("test-user", { maxRequests: 10, windowMs: 60_000 });
    }
    const result = rateLimit("test-user", { maxRequests: 10, windowMs: 60_000 });
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(body.error).toContain("Too many requests");
    expect(result!.status).toBe(429);
  });

  it("tracks keys independently", async () => {
    const rateLimit = await getRateLimit();
    for (let i = 0; i < 3; i++) {
      rateLimit("user-a", { maxRequests: 3, windowMs: 60_000 });
    }
    // user-a is blocked
    expect(rateLimit("user-a", { maxRequests: 3, windowMs: 60_000 })).not.toBeNull();
    // user-b is still allowed
    expect(rateLimit("user-b", { maxRequests: 3, windowMs: 60_000 })).toBeNull();
  });

  it("allows requests after the window expires", async () => {
    const rateLimit = await getRateLimit();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    for (let i = 0; i < 2; i++) {
      rateLimit("test-expire", { maxRequests: 2, windowMs: 1_000 });
    }
    expect(rateLimit("test-expire", { maxRequests: 2, windowMs: 1_000 })).not.toBeNull();

    // Advance time past window
    vi.spyOn(Date, "now").mockReturnValue(now + 1_001);
    expect(rateLimit("test-expire", { maxRequests: 2, windowMs: 1_000 })).toBeNull();

    vi.restoreAllMocks();
  });
});
