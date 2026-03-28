import type { serviceSections } from "@/lib/db/schema";
import type { InferInsertModel } from "drizzle-orm";

export type InsertServiceSection = InferInsertModel<typeof serviceSections>;

const GLORIA_SUPPRESSED_SEASONS = ["ADVENT", "LENT", "HOLY_WEEK"];

export function applySeasonalRules(
  sections: InsertServiceSection[],
  season: string,
): InsertServiceSection[] {
  const upper = season.toUpperCase();
  if (!GLORIA_SUPPRESSED_SEASONS.some(s => upper === s)) {
    return sections;
  }

  return sections.map((section) => {
    if (section.musicSlotType === "MASS_SETTING_GLORIA") {
      return {
        ...section,
        musicSlotType: "MASS_SETTING_KYRIE" as InsertServiceSection["musicSlotType"],
        title: "Kyrie",
        sectionKey: "gathering.kyrie",
      };
    }
    return section;
  });
}
