import type { serviceSections } from "@/lib/db/schema";
import type { InferInsertModel } from "drizzle-orm";

export type InsertServiceSection = InferInsertModel<typeof serviceSections>;

export function applySeasonalRules(
  sections: InsertServiceSection[],
  season: string,
): InsertServiceSection[] {
  const upper = season.toUpperCase();
  if (!upper.includes("ADVENT") && !upper.includes("LENT")) {
    return sections;
  }

  return sections.map((section) => {
    if (section.musicSlotType === "MASS_SETTING_GLORIA") {
      return {
        ...section,
        musicSlotType: "MASS_SETTING_KYRIE" as InsertServiceSection["musicSlotType"],
        title: "Kyrie",
      };
    }
    return section;
  });
}
