import { describe, it, expect } from "vitest";
import { applySeasonalRules } from "../seasonal-rules";
import type { InsertServiceSection } from "../seasonal-rules";

function makeSection(overrides: Partial<InsertServiceSection> = {}): InsertServiceSection {
  return {
    serviceId: "service-1",
    sectionKey: "gathering.gloria",
    title: "Gloria in Excelsis",
    majorSection: "gathering",
    positionOrder: 3,
    liturgicalTextId: null,
    musicSlotType: "MASS_SETTING_GLORIA",
    placeholderType: null,
    visible: true,
    ...overrides,
  };
}

describe("applySeasonalRules", () => {
  it("returns sections unchanged during ordinary time", () => {
    const sections = [makeSection()];
    const result = applySeasonalRules(sections, "ORDINARY_TIME");
    expect(result).toEqual(sections);
  });

  it("ADVENT: replaces MASS_SETTING_GLORIA with MASS_SETTING_KYRIE, title=Kyrie, sectionKey=gathering.kyrie", () => {
    const sections = [makeSection()];
    const result = applySeasonalRules(sections, "ADVENT");
    expect(result).toHaveLength(1);
    expect(result[0].musicSlotType).toBe("MASS_SETTING_KYRIE");
    expect(result[0].title).toBe("Kyrie");
    expect(result[0].sectionKey).toBe("gathering.kyrie");
  });

  it("LENT: replaces MASS_SETTING_GLORIA with MASS_SETTING_KYRIE, title=Kyrie, sectionKey=gathering.kyrie", () => {
    const sections = [makeSection()];
    const result = applySeasonalRules(sections, "LENT");
    expect(result).toHaveLength(1);
    expect(result[0].musicSlotType).toBe("MASS_SETTING_KYRIE");
    expect(result[0].title).toBe("Kyrie");
    expect(result[0].sectionKey).toBe("gathering.kyrie");
  });

  it("HOLY_WEEK: replaces MASS_SETTING_GLORIA with MASS_SETTING_KYRIE, title=Kyrie, sectionKey=gathering.kyrie", () => {
    const sections = [makeSection()];
    const result = applySeasonalRules(sections, "HOLY_WEEK");
    expect(result).toHaveLength(1);
    expect(result[0].musicSlotType).toBe("MASS_SETTING_KYRIE");
    expect(result[0].title).toBe("Kyrie");
    expect(result[0].sectionKey).toBe("gathering.kyrie");
  });

  it("returns sections unchanged when no Gloria section is present", () => {
    const sections = [
      makeSection({ sectionKey: "gathering.introit", title: "Introit", musicSlotType: "HYMN" }),
      makeSection({ sectionKey: "gathering.kyrie", title: "Kyrie", musicSlotType: "MASS_SETTING_KYRIE" }),
    ];
    const result = applySeasonalRules(sections, "LENT");
    expect(result).toEqual(sections);
  });

  it("does not modify sectionKey of non-Gloria sections", () => {
    const nonGloria = makeSection({
      sectionKey: "word.psalm",
      title: "Psalm",
      musicSlotType: "PSALM",
    });
    const gloria = makeSection();
    const result = applySeasonalRules([nonGloria, gloria], "ADVENT");
    // First section is unchanged
    expect(result[0].sectionKey).toBe("word.psalm");
    expect(result[0].musicSlotType).toBe("PSALM");
    // Second section is substituted
    expect(result[1].sectionKey).toBe("gathering.kyrie");
  });

  it("case-insensitive season string is matched correctly", () => {
    const sections = [makeSection()];
    // lowercase 'advent' should still trigger the rule
    const result = applySeasonalRules(sections, "advent");
    expect(result[0].musicSlotType).toBe("MASS_SETTING_KYRIE");
    expect(result[0].sectionKey).toBe("gathering.kyrie");
  });

  it("partial season name match does not trigger rule (e.g. ADVENT_2 is not in the allowlist)", () => {
    const sections = [makeSection()];
    // ADVENT_2 should NOT match the exact allowlist entries
    const result = applySeasonalRules(sections, "ADVENT_2");
    expect(result[0].musicSlotType).toBe("MASS_SETTING_GLORIA");
    expect(result[0].sectionKey).toBe("gathering.gloria");
  });
});
