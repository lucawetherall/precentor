import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env proxy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module registry so env.ts re-evaluates
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns NEXT_PUBLIC_APP_URL default when not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const { env } = await import("../env");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://precentor.app");
  });

  it("returns NEXT_PUBLIC_APP_URL when set", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom.app";
    const { env } = await import("../env");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://custom.app");
  });

  it("returns empty string for GEMINI_API_KEY when not set", async () => {
    delete process.env.GEMINI_API_KEY;
    const { env } = await import("../env");
    expect(env.GEMINI_API_KEY).toBe("");
  });

  it("returns GEMINI_API_KEY when set", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const { env } = await import("../env");
    expect(env.GEMINI_API_KEY).toBe("test-key");
  });

  it("returns LLM_PROVIDER default when not set", async () => {
    delete process.env.LLM_PROVIDER;
    const { env } = await import("../env");
    expect(env.LLM_PROVIDER).toBe("gemini");
  });

  it("throws for required DATABASE_URL when not set", async () => {
    delete process.env.DATABASE_URL;
    const { env } = await import("../env");
    expect(() => env.DATABASE_URL).toThrow("Missing required environment variable: DATABASE_URL");
  });

  it("throws for required NEXT_PUBLIC_SUPABASE_URL when not set", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { env } = await import("../env");
    expect(() => env.NEXT_PUBLIC_SUPABASE_URL).toThrow("Missing required environment variable");
  });

  it("returns undefined for unknown properties", async () => {
    const { env } = await import("../env");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((env as any).UNKNOWN_PROPERTY).toBeUndefined();
  });

  it("returns empty string for RESEND_API_KEY when not set", async () => {
    delete process.env.RESEND_API_KEY;
    const { env } = await import("../env");
    expect(env.RESEND_API_KEY).toBe("");
  });

  it("returns empty string for CRON_SECRET when not set", async () => {
    delete process.env.CRON_SECRET;
    const { env } = await import("../env");
    expect(env.CRON_SECRET).toBe("");
  });
});
