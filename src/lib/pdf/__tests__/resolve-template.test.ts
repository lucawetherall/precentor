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

describe("resolveTemplate", () => {
  it("passes through static sections unchanged", () => {
    const section: LiturgicalSection = {
      id: "test.greeting",
      title: "The Greeting",
      blocks: [
        { speaker: "president", text: "The Lord be with you" },
        { speaker: "all", text: "and also with you." },
      ],
    };
    const data = makeData({ template: makeTemplate([section]) });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedBlocks).toHaveLength(2);
  });

  it("resolves collect placeholder", () => {
    const section: LiturgicalSection = {
      id: "test.collect",
      title: "The Collect",
      blocks: [{ speaker: "rubric", text: "Silence is kept." }],
      placeholder: "collect",
    };
    const data = makeData({
      template: makeTemplate([section]),
      collect: "Almighty God, grant...",
    });
    const resolved = resolveTemplate(data);
    expect(resolved[0].resolvedBlocks).toHaveLength(2);
    expect(resolved[0].resolvedBlocks[1].text).toBe("Almighty God, grant...");
  });

  it("resolves reading placeholders", () => {
    const section: LiturgicalSection = {
      id: "test.ot",
      title: "First Reading",
      blocks: [],
      placeholder: "reading-ot",
    };
    const data = makeData({
      template: makeTemplate([section]),
      readings: [
        { position: "OLD_TESTAMENT", reference: "Genesis 1:1-5" },
        { position: "GOSPEL", reference: "John 1:1-14" },
      ],
    });
    const resolved = resolveTemplate(data);
    expect(resolved[0].reading?.reference).toBe("Genesis 1:1-5");
  });

  it("resolves eucharistic prayer placeholder", () => {
    const section: LiturgicalSection = {
      id: "test.ep",
      title: "Eucharistic Prayer",
      blocks: [],
      placeholder: "eucharistic-prayer",
    };
    const epSection: LiturgicalSection = {
      id: "ep-b",
      title: "Prayer B",
      blocks: [{ speaker: "president", text: "Lord, you are holy..." }],
    };
    const data = makeData({
      template: makeTemplate([section]),
      eucharisticPrayer: epSection,
    });
    const resolved = resolveTemplate(data);
    expect(resolved[0].resolvedBlocks[0].text).toBe("Lord, you are holy...");
  });

  it("applies liturgical overrides", () => {
    const section: LiturgicalSection = {
      id: "test.greeting",
      title: "The Greeting",
      blocks: [{ speaker: "president", text: "Original text" }],
      allowOverride: true,
    };
    const data = makeData({
      template: makeTemplate([section]),
      liturgicalOverrides: { "test.greeting": "Custom greeting text" },
    });
    const resolved = resolveTemplate(data);
    expect(resolved[0].resolvedBlocks).toHaveLength(1);
    expect(resolved[0].resolvedBlocks[0].text).toBe("Custom greeting text");
  });

  it("filters out optional sections with no content", () => {
    const section: LiturgicalSection = {
      id: "test.anthem",
      title: "Anthem",
      blocks: [{ speaker: "rubric", text: "The choir sings." }],
      musicSlotType: "ANTHEM",
      optional: true,
    };
    const data = makeData({ template: makeTemplate([section]) });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(0);
  });

  it("keeps optional sections that have music slot content", () => {
    const section: LiturgicalSection = {
      id: "test.anthem",
      title: "Anthem",
      blocks: [{ speaker: "rubric", text: "The choir sings." }],
      musicSlotType: "ANTHEM",
      optional: true,
    };
    const data = makeData({
      template: makeTemplate([section]),
      musicSlots: [
        {
          slotType: "ANTHEM",
          positionOrder: 1,
          label: "Anthem",
          value: "If ye love me",
          anthem: { title: "If ye love me", composer: "Tallis" },
        },
      ],
    });
    const resolved = resolveTemplate(data);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].musicSlot?.value).toBe("If ye love me");
  });

  it("consumes hymn slots in order across multiple sections", () => {
    const sections: LiturgicalSection[] = [
      { id: "entrance", title: "Entrance Hymn", blocks: [], musicSlotType: "HYMN" },
      { id: "gradual", title: "Gradual Hymn", blocks: [], musicSlotType: "HYMN" },
      { id: "final", title: "Final Hymn", blocks: [], musicSlotType: "HYMN" },
    ];
    const data = makeData({
      template: makeTemplate(sections),
      musicSlots: [
        { slotType: "HYMN", positionOrder: 1, label: "Hymn", value: "First" },
        { slotType: "HYMN", positionOrder: 2, label: "Hymn", value: "Second" },
        { slotType: "HYMN", positionOrder: 3, label: "Hymn", value: "Third" },
      ],
    });
    const resolved = resolveTemplate(data);
    expect(resolved[0].musicSlot?.value).toBe("First");
    expect(resolved[1].musicSlot?.value).toBe("Second");
    expect(resolved[2].musicSlot?.value).toBe("Third");
  });
});
