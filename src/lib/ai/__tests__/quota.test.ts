import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockExecute } = vi.hoisted(() => ({ mockExecute: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { execute: mockExecute } }));

import { consumeAiQuota } from "../quota";

describe("consumeAiQuota", () => {
  const original = process.env.AI_DAILY_QUOTA;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_DAILY_QUOTA;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.AI_DAILY_QUOTA;
    else process.env.AI_DAILY_QUOTA = original;
  });

  it("allows a request at exactly the limit (used === limit)", async () => {
    mockExecute.mockResolvedValue([{ count: 200 }]);
    const res = await consumeAiQuota("church-1");
    expect(res).toEqual({ allowed: true, used: 200, limit: 200 });
  });

  it("blocks the first request over the limit (used === limit + 1)", async () => {
    mockExecute.mockResolvedValue([{ count: 201 }]);
    const res = await consumeAiQuota("church-1");
    expect(res).toEqual({ allowed: false, used: 201, limit: 200 });
  });

  it("honours a positive AI_DAILY_QUOTA override", async () => {
    process.env.AI_DAILY_QUOTA = "5";
    mockExecute.mockResolvedValue([{ count: 6 }]);
    const res = await consumeAiQuota("church-1");
    expect(res).toEqual({ allowed: false, used: 6, limit: 5 });
  });

  it("ignores a non-positive AI_DAILY_QUOTA override and uses the default", async () => {
    process.env.AI_DAILY_QUOTA = "0";
    mockExecute.mockResolvedValue([{ count: 10 }]);
    const res = await consumeAiQuota("church-1");
    expect(res.limit).toBe(200);
  });

  it("ignores a non-numeric AI_DAILY_QUOTA override and uses the default", async () => {
    process.env.AI_DAILY_QUOTA = "lots";
    mockExecute.mockResolvedValue([{ count: 10 }]);
    const res = await consumeAiQuota("church-1");
    expect(res.limit).toBe(200);
  });

  it("fails open (allowed) when the quota table query throws", async () => {
    mockExecute.mockRejectedValue(new Error("db unreachable"));
    const res = await consumeAiQuota("church-1");
    expect(res).toEqual({ allowed: true, used: 0, limit: 200 });
  });

  it("treats a missing count in the result row as 0", async () => {
    mockExecute.mockResolvedValue([]);
    const res = await consumeAiQuota("church-1");
    expect(res.used).toBe(0);
    expect(res.allowed).toBe(true);
  });
});
