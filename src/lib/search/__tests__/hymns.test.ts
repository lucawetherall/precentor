import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the drizzle operators so we can inspect how searchHymns composes its
// WHERE clause without standing up a real database. Each operator returns a
// tagged plain object that records its arguments.
vi.mock("drizzle-orm", () => ({
  ilike: vi.fn((col, val) => ({ op: "ilike", col, val })),
  or: vi.fn((...c) => ({ op: "or", c })),
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  and: vi.fn((...c) => ({ op: "and", c })),
  inArray: vi.fn((col, vals) => ({ op: "inArray", col, vals })),
  sql: Object.assign(
    () => ({ as: (name: string) => ({ op: "sql", as: name }) }),
    {}
  ),
}));

vi.mock("@/lib/db/schema", () => ({
  hymns: { id: "hymns.id", firstLine: "hymns.firstLine", tuneName: "hymns.tuneName", author: "hymns.author", number: "hymns.number", book: "hymns.book" },
  hymnVerses: { hymnId: "hymnVerses.hymnId" },
}));

// Records every `.where()` argument and the `.offset()` value, then resolves
// each terminal `await` from a FIFO queue of canned result sets.
const wheres: unknown[] = [];
const offsets: number[] = [];
let queue: unknown[][] = [];
let idx = 0;

vi.mock("@/lib/db", () => {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(queue[idx++] ?? []);
        if (prop === "where") return (arg: unknown) => (wheres.push(arg), proxy);
        if (prop === "offset") return (n: number) => (offsets.push(n), proxy);
        return () => proxy;
      },
    }
  );
  return { db: { select: () => proxy } };
});

import { searchHymns } from "../hymns";
import { eq, and, or, ilike } from "drizzle-orm";

beforeEach(() => {
  wheres.length = 0;
  offsets.length = 0;
  idx = 0;
  queue = [];
  vi.clearAllMocks();
});

describe("searchHymns", () => {
  it("escapes LIKE wildcards in the query before building ilike conditions", async () => {
    queue = [[], []];
    await searchHymns("100%");
    expect(ilike).toHaveBeenCalledWith("hymns.firstLine", "%100\\%%");
  });

  it("adds a numeric eq(number) condition when the query parses as a number", async () => {
    queue = [[], []];
    await searchHymns("376");
    expect(eq).toHaveBeenCalledWith("hymns.number", 376);
  });

  it("does not add a numeric condition for a non-numeric query", async () => {
    queue = [[], []];
    await searchHymns("Aberystwyth");
    // eq is only ever used for the numeric branch / book filter here.
    expect(eq).not.toHaveBeenCalled();
  });

  it("ANDs a book filter onto the search clause when book is given", async () => {
    queue = [[], []];
    await searchHymns("grace", "NEH");
    expect(eq).toHaveBeenCalledWith("hymns.book", "NEH");
    expect(and).toHaveBeenCalled();
  });

  it("uses a bare OR clause (no AND) when no book filter is given", async () => {
    queue = [[], []];
    await searchHymns("grace");
    expect(and).not.toHaveBeenCalled();
    expect(or).toHaveBeenCalled();
  });

  it("passes the offset through to the query", async () => {
    queue = [[], []];
    await searchHymns("grace", undefined, 40);
    expect(offsets[0]).toBe(40);
  });

  it("short-circuits and returns [] without a second query when no hymns match", async () => {
    queue = [[]]; // only the first select resolves; a second await would throw
    const result = await searchHymns("nomatch");
    expect(result).toEqual([]);
    expect(idx).toBe(1); // verse-count query was never run
  });

  it("maps verse counts onto matched hymns, defaulting to 0 when absent", async () => {
    queue = [
      [{ id: "h1", firstLine: "Abide with me" }, { id: "h2", firstLine: "Lo he comes" }],
      [{ hymnId: "h1", totalVerses: 5 }],
    ];
    const result = await searchHymns("come");
    expect(result).toEqual([
      { id: "h1", firstLine: "Abide with me", totalVerses: 5 },
      { id: "h2", firstLine: "Lo he comes", totalVerses: 0 },
    ]);
  });
});
