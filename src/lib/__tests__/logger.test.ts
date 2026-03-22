import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the logger's formatting behavior by mocking console methods
describe("logger", () => {
  const originalEnv = process.env.NODE_ENV;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("logger.info calls console.log", async () => {
    const { logger } = await import("@/lib/logger");
    logger.info("test message");
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy.mock.calls[0][0]).toContain("test message");
  });

  it("logger.warn calls console.warn", async () => {
    const { logger } = await import("@/lib/logger");
    logger.warn("warning message");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain("warning message");
  });

  it("logger.error calls console.error", async () => {
    const { logger } = await import("@/lib/logger");
    logger.error("error message", new Error("test error"));
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain("error message");
  });

  it("logger.info includes context in output", async () => {
    const { logger } = await import("@/lib/logger");
    logger.info("sync complete", { count: 42 });
    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain("42");
  });

  it("logger.error extracts error message from Error objects", async () => {
    const { logger } = await import("@/lib/logger");
    logger.error("operation failed", new Error("details here"));
    const output = errorSpy.mock.calls[0][0] as string;
    expect(output).toContain("details here");
  });

  it("logger.error handles non-Error error arguments", async () => {
    const { logger } = await import("@/lib/logger");
    logger.error("operation failed", "string error");
    const output = errorSpy.mock.calls[0][0] as string;
    expect(output).toContain("string error");
  });

  it("logger.error works without error argument", async () => {
    const { logger } = await import("@/lib/logger");
    logger.error("simple error");
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain("simple error");
  });

  it("development format uses bracketed level prefix", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    vi.resetModules();
    const { logger } = await import("@/lib/logger");
    logger.info("dev message");
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/^\[INFO\]/);
  });

  it("production format outputs valid JSON", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    vi.resetModules();
    const { logger } = await import("@/lib/logger");
    logger.info("prod message", { key: "value" });
    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("prod message");
    expect(parsed.context).toEqual({ key: "value" });
    expect(parsed.timestamp).toBeDefined();
  });
});
