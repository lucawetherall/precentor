import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Tag drizzle's comparison + ordering helpers so the mock chain can
// distinguish the two queries by their *semantics* rather than by call order.
// If the implementation swaps the Promise.all branches, or changes which
// predicate drives which query, tests still assert correct behaviour because
// each chain resolves based on the operators it sees.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    gt: vi.fn((col: unknown, val: unknown) => ({ __tag: "gt", col, val })),
    lt: vi.fn((col: unknown, val: unknown) => ({ __tag: "lt", col, val })),
    asc: vi.fn((col: unknown) => ({ __tag: "asc", col })),
    desc: vi.fn((col: unknown) => ({ __tag: "desc", col })),
  };
});

// Import after mocks are set up.
import { db } from "@/lib/db";
import { getAdjacentLiturgicalDays } from "../adjacent-liturgical-days";

const mockSelect = db.select as ReturnType<typeof vi.fn>;

interface ClauseTag {
  __tag: "gt" | "lt" | "asc" | "desc";
}

function isTaggedClause(value: unknown): value is ClauseTag {
  return (
    typeof value === "object" &&
    value !== null &&
    "__tag" in value &&
    typeof (value as { __tag: unknown }).__tag === "string"
  );
}

/**
 * Install a drizzle-style select mock that decides each chain's result by
 * inspecting the `where` predicate and `orderBy` direction it receives.
 * This is order-independent: the implementation may run next/prev queries in
 * any order and the right fixture rows are returned to each.
 */
function installSmartSelect(rows: { next: unknown[]; prev: unknown[] }) {
  mockSelect.mockImplementation(() => {
    let branch: "next" | "prev" | null = null;

    const chain: Record<string, unknown> = {};

    chain.from = vi.fn().mockReturnValue(chain);

    chain.where = vi.fn().mockImplementation((clause: unknown) => {
      if (isTaggedClause(clause)) {
        if (clause.__tag === "gt") branch = "next";
        else if (clause.__tag === "lt") branch = "prev";
      }
      return chain;
    });

    chain.orderBy = vi.fn().mockImplementation((arg: unknown) => {
      // Fallback: if `where` somehow didn't set branch, infer from direction.
      if (branch === null && isTaggedClause(arg)) {
        if (arg.__tag === "asc") branch = "next";
        else if (arg.__tag === "desc") branch = "prev";
      }
      return chain;
    });

    chain.limit = vi.fn().mockImplementation(() => {
      if (branch === null) {
        throw new Error(
          "test-mock: chain reached .limit() without branch resolution — check where/orderBy tags",
        );
      }
      return Promise.resolve(branch === "next" ? rows.next : rows.prev);
    });

    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAdjacentLiturgicalDays", () => {
  it("returns both prev and next when the current date is between two calendar days", async () => {
    installSmartSelect({
      next: [{ date: "2026-04-26" }],
      prev: [{ date: "2026-04-12" }],
    });

    const result = await getAdjacentLiturgicalDays("2026-04-19");

    expect(result).toEqual({ prev: "2026-04-12", next: "2026-04-26" });
  });

  it("returns prev=null when the current date is the first row", async () => {
    installSmartSelect({
      next: [{ date: "2026-01-01" }],
      prev: [],
    });

    const result = await getAdjacentLiturgicalDays("2025-12-25");

    expect(result).toEqual({ prev: null, next: "2026-01-01" });
  });

  it("returns next=null when the current date is the last row", async () => {
    installSmartSelect({
      next: [],
      prev: [{ date: "2026-12-24" }],
    });

    const result = await getAdjacentLiturgicalDays("2026-12-25");

    expect(result).toEqual({ prev: "2026-12-24", next: null });
  });

  it("still returns the nearest row on each side when the current date is not in the table", async () => {
    // e.g. Tuesday between Sunday and next Sunday — no liturgicalDays row for Tuesday
    installSmartSelect({
      next: [{ date: "2026-04-26" }],
      prev: [{ date: "2026-04-19" }],
    });

    const result = await getAdjacentLiturgicalDays("2026-04-22");

    expect(result).toEqual({ prev: "2026-04-19", next: "2026-04-26" });
  });

  it("returns both null when the table is empty", async () => {
    installSmartSelect({
      next: [],
      prev: [],
    });

    const result = await getAdjacentLiturgicalDays("2026-04-19");

    expect(result).toEqual({ prev: null, next: null });
  });
});
