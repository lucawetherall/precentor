// Maps music slots to template sections by slot type

import type { MusicSlotEntry } from "@/types/service-sheet";
import type { MusicSlotType } from "@/types";

/**
 * Group music slots by slotType, preserving positionOrder.
 * For types with multiple entries (e.g. HYMN), the renderer
 * consumes them in order as it encounters matching template sections.
 */
export function buildSlotMap(
  slots: MusicSlotEntry[]
): Map<MusicSlotType, MusicSlotEntry[]> {
  const map = new Map<MusicSlotType, MusicSlotEntry[]>();

  const sorted = [...slots].sort((a, b) => a.positionOrder - b.positionOrder);

  for (const slot of sorted) {
    const existing = map.get(slot.slotType);
    if (existing) {
      existing.push(slot);
    } else {
      map.set(slot.slotType, [slot]);
    }
  }

  return map;
}

/**
 * Consume the next available slot of a given type from the map.
 * Returns undefined if no slots of that type remain.
 * This mutates the map by shifting from the array.
 */
export function consumeSlot(
  map: Map<MusicSlotType, MusicSlotEntry[]>,
  slotType: MusicSlotType
): MusicSlotEntry | undefined {
  const slots = map.get(slotType);
  if (!slots || slots.length === 0) return undefined;
  return slots.shift();
}
