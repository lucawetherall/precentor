// Resolves a ServiceTemplate's placeholders with actual service data

import type { LiturgicalSection, LiturgicalTextBlock } from "@/data/liturgy/types";
import type { BookletServiceSheetData, MusicSlotEntry, ReadingEntry } from "@/types/service-sheet";
import type { MusicSlotType } from "@/types";
import { buildSlotMap, consumeSlot } from "./slot-to-section-map";

/** A resolved section ready for rendering */
export interface ResolvedSection {
  section: LiturgicalSection;
  resolvedBlocks: LiturgicalTextBlock[];
  reading?: ReadingEntry;
  musicSlot?: MusicSlotEntry;
}

const READING_POSITION_MAP: Record<string, string> = {
  "reading-ot": "OLD_TESTAMENT",
  "reading-epistle": "EPISTLE",
  "reading-gospel": "GOSPEL",
  "reading-psalm": "PSALM",
};

function findReading(
  readings: ReadingEntry[],
  placeholder: string
): ReadingEntry | undefined {
  const position = READING_POSITION_MAP[placeholder];
  if (!position) return undefined;
  return readings.find((r) => r.position === position);
}

/**
 * Walk a template's sections and resolve all dynamic content.
 * Returns an ordered list of ResolvedSections ready for rendering.
 */
export function resolveTemplate(
  data: BookletServiceSheetData
): ResolvedSection[] {
  const slotMap = buildSlotMap(data.musicSlots);
  const resolved: ResolvedSection[] = [];

  for (const section of data.template.sections) {
    let resolvedBlocks = [...section.blocks];
    let reading: ReadingEntry | undefined;
    let musicSlot: MusicSlotEntry | undefined;

    // Apply liturgical overrides
    if (data.liturgicalOverrides[section.id]) {
      resolvedBlocks = [
        { speaker: "president", text: data.liturgicalOverrides[section.id] },
      ];
    }

    // Resolve placeholders
    if (section.placeholder) {
      switch (section.placeholder) {
        case "collect":
          if (data.collect) {
            resolvedBlocks = [
              ...resolvedBlocks,
              { speaker: "president", text: data.collect },
            ];
          }
          break;

        case "post-communion":
          if (data.postCommunion) {
            resolvedBlocks = [
              ...resolvedBlocks,
              { speaker: "president", text: data.postCommunion },
            ];
          }
          break;

        case "eucharistic-prayer":
          if (data.eucharisticPrayer) {
            resolvedBlocks = data.eucharisticPrayer.blocks;
          }
          break;

        case "sermon":
          // Sermon is just a placeholder marker
          break;

        case "reading-ot":
        case "reading-epistle":
        case "reading-gospel":
        case "reading-psalm":
          reading = findReading(data.readings, section.placeholder);
          break;
      }
    }

    // Resolve music slot
    if (section.musicSlotType) {
      musicSlot = consumeSlot(slotMap, section.musicSlotType as MusicSlotType);
    }

    // Filter out optional sections with no meaningful content
    if (section.optional) {
      const hasContent =
        resolvedBlocks.some((b) => b.speaker !== "rubric") ||
        reading !== undefined ||
        musicSlot !== undefined;
      if (!hasContent) continue;
    }

    resolved.push({ section, resolvedBlocks, reading, musicSlot });
  }

  return resolved;
}
