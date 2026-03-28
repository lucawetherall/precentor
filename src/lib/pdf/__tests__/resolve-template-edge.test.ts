import { describe, it, expect } from "vitest";
import { resolveTemplate } from "../resolve-template";
import type { BookletServiceSheetData } from "@/types/service-sheet";
import type { ServiceTemplate, LiturgicalSection } from "@/data/liturgy/types";
import { DEFAULT_TEMPLATE_LAYOUT } from "@/types/service-sheet";

function makeTemplate(sections: LiturgicalSection[]): ServiceTemplate {
  return { serviceType: "SUNG_EUCHARIST", rite: "Test", sections };
}

function makeData(
  overrides: Partial<BookletServiceSheetData> = {}
): BookletServiceSheetData {
  return {
    mode: "booklet",
    churchName: "Test Church",
    serviceType: "SUNG_EUCHARIST",
    date: "2026-03-22",
    liturgicalName: "Third Sunday of Lent",
    season: "LENT",
    colour: "PURPLE",
    template: makeTemplate([]),
    liturgicalOverrides: {},
    readings: [],
    includeReadingText: false,
    musicSlots: [],
    templateLayout: DEFAULT_TEMPLATE_LAYOUT,
    ...overrides,
  };
}

describe("resolveTemplate edge cases", () => {
  it("section with musicSlotType gets undefined musicSlot when musicSlots array is empty", () => {
    const section: LiturgicalSection = {
      id: "test.hymn",
      title: "Entrance Hymn",
      blocks: [{ speaker: "president", text: "Let us sing." }],
      musicSlotType: "HYMN",
    };
    const data = makeData({
      template: makeTemplate([section]),
      musicSlots: [],
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].musicSlot).toBeUndefined();
  });

  it("reading placeholders return undefined reading when no readings provided", () => {
    const sections: LiturgicalSection[] = [
      {
        id: "test.ot",
        title: "First Reading",
        blocks: [],
        placeholder: "reading-ot",
      },
      {
        id: "test.epistle",
        title: "Second Reading",
        blocks: [],
        placeholder: "reading-nt",
      },
      {
        id: "test.gospel",
        title: "Gospel Reading",
        blocks: [],
        placeholder: "reading-gospel",
      },
      {
        id: "test.psalm",
        title: "Psalm",
        blocks: [],
        placeholder: "reading-psalm",
      },
    ];
    const data = makeData({
      template: makeTemplate(sections),
      readings: [],
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(4);
    for (const r of resolved) {
      expect(r.reading).toBeUndefined();
    }
  });

  it("optional section with no content is filtered out", () => {
    const section: LiturgicalSection = {
      id: "test.optional",
      title: "Optional Section",
      blocks: [{ speaker: "rubric", text: "A rubric direction." }],
      optional: true,
    };
    const data = makeData({ template: makeTemplate([section]) });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(0);
  });

  it("liturgical overrides replace section blocks", () => {
    const section: LiturgicalSection = {
      id: "test.penitence",
      title: "Prayers of Penitence",
      blocks: [
        { speaker: "president", text: "Original prayer text" },
        { speaker: "all", text: "Original response" },
      ],
      allowOverride: true,
    };
    const data = makeData({
      template: makeTemplate([section]),
      liturgicalOverrides: {
        "test.penitence": "Seasonal penitential text",
      },
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedBlocks).toHaveLength(1);
    expect(resolved[0].resolvedBlocks[0]).toEqual({
      speaker: "president",
      text: "Seasonal penitential text",
    });
  });

  it("collect placeholder adds president text block", () => {
    const section: LiturgicalSection = {
      id: "test.collect",
      title: "The Collect",
      blocks: [{ speaker: "rubric", text: "Silence is kept." }],
      placeholder: "collect",
    };
    const data = makeData({
      template: makeTemplate([section]),
      collect: "Almighty God, who through your Son...",
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedBlocks).toHaveLength(2);
    expect(resolved[0].resolvedBlocks[0]).toEqual({
      speaker: "rubric",
      text: "Silence is kept.",
    });
    expect(resolved[0].resolvedBlocks[1]).toEqual({
      speaker: "president",
      text: "Almighty God, who through your Son...",
    });
  });

  it("post-communion placeholder adds president text block", () => {
    const section: LiturgicalSection = {
      id: "test.postcom",
      title: "Post Communion",
      blocks: [{ speaker: "rubric", text: "Silence is kept." }],
      placeholder: "post-communion",
    };
    const data = makeData({
      template: makeTemplate([section]),
      postCommunion: "God of mercy, you have united us...",
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedBlocks).toHaveLength(2);
    expect(resolved[0].resolvedBlocks[0]).toEqual({
      speaker: "rubric",
      text: "Silence is kept.",
    });
    expect(resolved[0].resolvedBlocks[1]).toEqual({
      speaker: "president",
      text: "God of mercy, you have united us...",
    });
  });

  it("eucharistic prayer placeholder replaces blocks", () => {
    const section: LiturgicalSection = {
      id: "test.ep",
      title: "Eucharistic Prayer",
      blocks: [{ speaker: "rubric", text: "Original placeholder text" }],
      placeholder: "eucharistic-prayer",
    };
    const epSection: LiturgicalSection = {
      id: "ep-a",
      title: "Prayer A",
      blocks: [
        { speaker: "president", text: "The Lord is here." },
        { speaker: "all", text: "His Spirit is with us." },
        { speaker: "president", text: "Lift up your hearts." },
      ],
    };
    const data = makeData({
      template: makeTemplate([section]),
      eucharisticPrayer: epSection,
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedBlocks).toHaveLength(3);
    expect(resolved[0].resolvedBlocks[0].text).toBe("The Lord is here.");
    expect(resolved[0].resolvedBlocks[1].text).toBe("His Spirit is with us.");
    expect(resolved[0].resolvedBlocks[2].text).toBe("Lift up your hearts.");
  });
});
