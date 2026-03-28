import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTemplateSections } from "../template-resolution";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// We need to import db after the mock is set up
import { db } from "@/lib/db";

const mockSelect = db.select as ReturnType<typeof vi.fn>;

/**
 * Helper to build a chainable drizzle-style mock that resolves to `rows`.
 * Supports: .select().from().where().orderBy() → rows
 *           .select().from().where()           → rows  (no orderBy)
 *           .select().from().where() called twice (for two separate selects)
 */
function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockResolvedValue(rows);
  // also make the chain itself thenable so ".where()" without orderBy works
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(rows).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveTemplateSections", () => {
  it("returns empty array when no system template is found", async () => {
    // First select (serviceTypeTemplates) returns empty
    mockSelect.mockReturnValueOnce(makeChain([]));

    const result = await resolveTemplateSections("church-1", "sunday_morning");
    expect(result).toEqual([]);
  });

  it("returns system sections ordered by positionOrder when no church template exists", async () => {
    const systemTemplate = { id: "sys-tmpl-1", serviceType: "sunday_morning" };
    const systemSections = [
      {
        sectionKey: "introit",
        title: "Introit",
        majorSection: "gathering",
        positionOrder: 1,
        liturgicalTextId: null,
        musicSlotType: null,
        placeholderType: null,
        optional: false,
        allowOverride: false,
      },
      {
        sectionKey: "kyrie",
        title: "Kyrie",
        majorSection: "gathering",
        positionOrder: 2,
        liturgicalTextId: "text-uuid-1",
        musicSlotType: null,
        placeholderType: null,
        optional: false,
        allowOverride: true,
      },
    ];

    // First select: serviceTypeTemplates → finds the system template
    mockSelect.mockReturnValueOnce(makeChain([systemTemplate]));
    // Second select: churchTemplates → no church override
    mockSelect.mockReturnValueOnce(makeChain([]));
    // Third select: templateSections → system sections
    mockSelect.mockReturnValueOnce(makeChain(systemSections));

    const result = await resolveTemplateSections("church-1", "sunday_morning");
    expect(result).toEqual(systemSections);
  });

  it("returns church sections when a church template exists", async () => {
    const systemTemplate = { id: "sys-tmpl-1", serviceType: "sunday_morning" };
    const churchTemplate = { id: "church-tmpl-1", churchId: "church-1", baseTemplateId: "sys-tmpl-1" };
    const churchSections = [
      {
        sectionKey: "processional",
        title: "Processional Hymn",
        majorSection: "gathering",
        positionOrder: 1,
        liturgicalTextId: null,
        musicSlotType: "processional",
        placeholderType: null,
        optional: false,
        allowOverride: true,
      },
    ];

    // First select: serviceTypeTemplates → finds the system template
    mockSelect.mockReturnValueOnce(makeChain([systemTemplate]));
    // Second select: churchTemplates → finds the church template
    mockSelect.mockReturnValueOnce(makeChain([churchTemplate]));
    // Third select: churchTemplateSections → church sections
    mockSelect.mockReturnValueOnce(makeChain(churchSections));

    const result = await resolveTemplateSections("church-1", "sunday_morning");
    expect(result).toEqual(churchSections);
  });
});
