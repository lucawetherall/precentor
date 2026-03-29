import { describe, it, expect } from "vitest";
import { calculateCompleteness } from "../completeness";

describe("calculateCompleteness", () => {
  it("returns 'complete' when all music slots filled and all placeholders resolved", () => {
    const sections = [
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: null, musicSlotId: null, placeholderType: "collect", placeholderValue: "Let us pray...", visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("complete");
  });

  it("returns 'partial' when some slots are filled but not all", () => {
    const sections = [
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: "offertory", musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("partial");
  });

  it("returns 'empty' when nothing is filled", () => {
    const sections = [
      { musicSlotType: "processional", musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: null, musicSlotId: null, placeholderType: "collect", placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("empty");
  });

  it("returns 'empty' when there are no music or placeholder sections", () => {
    const sections = [
      { musicSlotType: null, musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: null, musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("empty");
  });

  it("returns 'empty' when the sections array is empty", () => {
    expect(calculateCompleteness([])).toBe("empty");
  });

  it("hidden sections do not count toward completeness", () => {
    const sections = [
      // hidden filled section — should not count
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: false },
      // visible unfilled section
      { musicSlotType: "offertory", musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("empty");
  });

  it("hidden sections with music slots do not inflate the total", () => {
    const sections = [
      // visible and filled
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: true },
      // hidden and unfilled — should not count at all
      { musicSlotType: "offertory", musicSlotId: null, placeholderType: null, placeholderValue: null, visible: false },
    ];
    // Only one visible music slot, and it's filled → complete
    expect(calculateCompleteness(sections)).toBe("complete");
  });

  it("returns 'complete' for a non-eucharist service when all music slots are filled", () => {
    // No eucharistic prayer placeholder; just music slots all filled
    const sections = [
      { musicSlotType: "introit", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: "offertory", musicSlotId: "hymn-2", placeholderType: null, placeholderValue: null, visible: true },
      { musicSlotType: "recessional", musicSlotId: "hymn-3", placeholderType: null, placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("complete");
  });

  it("returns 'partial' when placeholders partially resolved", () => {
    const sections = [
      { musicSlotType: null, musicSlotId: null, placeholderType: "collect", placeholderValue: "Let us pray...", visible: true },
      { musicSlotType: null, musicSlotId: null, placeholderType: "eucharistic_prayer", placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("partial");
  });

  it("returns 'empty' when all sections are hidden", () => {
    const sections = [
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: false },
      { musicSlotType: "offertory", musicSlotId: "hymn-2", placeholderType: null, placeholderValue: null, visible: false },
    ];
    expect(calculateCompleteness(sections)).toBe("empty");
  });

  it("handles mix of visible/hidden with only non-slot sections visible", () => {
    const sections = [
      { musicSlotType: "processional", musicSlotId: "hymn-1", placeholderType: null, placeholderValue: null, visible: false },
      { musicSlotType: null, musicSlotId: null, placeholderType: null, placeholderValue: null, visible: true },
    ];
    // No visible music or placeholder sections
    expect(calculateCompleteness(sections)).toBe("empty");
  });

  it("returns 'complete' with single visible filled placeholder and no music slots", () => {
    const sections = [
      { musicSlotType: null, musicSlotId: null, placeholderType: "collect", placeholderValue: "Collect text", visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("complete");
  });

  it("returns 'empty' with single visible unfilled placeholder and no music slots", () => {
    const sections = [
      { musicSlotType: null, musicSlotId: null, placeholderType: "collect", placeholderValue: null, visible: true },
    ];
    expect(calculateCompleteness(sections)).toBe("empty");
  });
});
