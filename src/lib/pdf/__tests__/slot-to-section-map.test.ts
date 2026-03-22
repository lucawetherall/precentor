import { describe, it, expect } from "vitest";
import { buildSlotMap, consumeSlot } from "../slot-to-section-map";
import type { MusicSlotEntry } from "@/types/service-sheet";

function makeSlot(slotType: string, order: number, value = "Test"): MusicSlotEntry {
  return {
    slotType: slotType as MusicSlotEntry["slotType"],
    positionOrder: order,
    label: slotType,
    value,
  };
}

describe("buildSlotMap", () => {
  it("groups slots by type", () => {
    const slots = [
      makeSlot("HYMN", 1, "Hymn 1"),
      makeSlot("ANTHEM", 2, "Anthem"),
      makeSlot("HYMN", 3, "Hymn 2"),
      makeSlot("HYMN", 4, "Hymn 3"),
    ];
    const map = buildSlotMap(slots);
    expect(map.get("HYMN")).toHaveLength(3);
    expect(map.get("ANTHEM")).toHaveLength(1);
  });

  it("preserves position order within groups", () => {
    const slots = [
      makeSlot("HYMN", 3, "Third"),
      makeSlot("HYMN", 1, "First"),
      makeSlot("HYMN", 2, "Second"),
    ];
    const map = buildSlotMap(slots);
    const hymns = map.get("HYMN")!;
    expect(hymns[0].value).toBe("First");
    expect(hymns[1].value).toBe("Second");
    expect(hymns[2].value).toBe("Third");
  });

  it("returns empty map for no slots", () => {
    const map = buildSlotMap([]);
    expect(map.size).toBe(0);
  });
});

describe("consumeSlot", () => {
  it("returns and removes the first slot of a type", () => {
    const slots = [
      makeSlot("HYMN", 1, "Hymn 1"),
      makeSlot("HYMN", 2, "Hymn 2"),
    ];
    const map = buildSlotMap(slots);

    const first = consumeSlot(map, "HYMN");
    expect(first?.value).toBe("Hymn 1");
    expect(map.get("HYMN")).toHaveLength(1);

    const second = consumeSlot(map, "HYMN");
    expect(second?.value).toBe("Hymn 2");

    const third = consumeSlot(map, "HYMN");
    expect(third).toBeUndefined();
  });

  it("returns undefined for missing type", () => {
    const map = buildSlotMap([]);
    expect(consumeSlot(map, "ANTHEM")).toBeUndefined();
  });
});
