import { describe, it, expect, vi, beforeEach } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { execute } }));
vi.mock("drizzle-orm", () => ({ sql: vi.fn() }));

import { GET } from "../route";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/health", () => {
  it("returns 200 ok when the database responds", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns 503 unhealthy when the database is unreachable", async () => {
    execute.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("unhealthy");
  });
});
