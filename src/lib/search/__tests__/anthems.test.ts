import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  ilike: vi.fn((col, val) => ({ op: "ilike", col, val })),
  or: vi.fn((...c) => ({ op: "or", c })),
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...c) => ({ op: "and", c })),
  isNull: vi.fn((col) => ({ op: "isNull", col })),
}));

vi.mock("@/lib/db/schema", () => ({
  anthems: { title: "anthems.title", composer: "anthems.composer", churchId: "anthems.churchId" },
}));

let resolved: unknown[] = [];
const wheres: unknown[] = [];
const offsets: number[] = [];

vi.mock("@/lib/db", () => {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(resolved);
        if (prop === "where") return (arg: unknown) => (wheres.push(arg), proxy);
        if (prop === "offset") return (n: number) => (offsets.push(n), proxy);
        return () => proxy;
      },
    }
  );
  return { db: { select: () => proxy } };
});

import { searchAnthems } from "../anthems";
import { eq, isNull, or } from "drizzle-orm";

beforeEach(() => {
  wheres.length = 0;
  offsets.length = 0;
  resolved = [];
  vi.clearAllMocks();
});

describe("searchAnthems", () => {
  it("escapes wildcards in the query", async () => {
    await searchAnthems("Te_Deum");
    const { ilike } = await import("drizzle-orm");
    expect(ilike).toHaveBeenCalledWith("anthems.title", "%Te\\_Deum%");
  });

  it("scopes to church-specific OR global anthems when a churchId is given", async () => {
    await searchAnthems("Ave", "church-1");
    expect(eq).toHaveBeenCalledWith("anthems.churchId", "church-1");
    expect(isNull).toHaveBeenCalledWith("anthems.churchId");
    // The scope clause is an OR of (eq church) and (isNull) — second `or` call.
    expect(or).toHaveBeenCalledTimes(2);
  });

  it("scopes to global-only anthems when no churchId is given", async () => {
    await searchAnthems("Ave");
    expect(eq).not.toHaveBeenCalled();
    expect(isNull).toHaveBeenCalledWith("anthems.churchId");
  });

  it("passes the offset through", async () => {
    await searchAnthems("Ave", "church-1", 20);
    expect(offsets[0]).toBe(20);
  });
});
