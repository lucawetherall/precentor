"use client";

import type { ServiceSection } from "./section-row";
import { HymnPicker } from "./hymn-picker";
import { MassSettingControl } from "./mass-setting-control";
import { CollectChooser } from "./collect-chooser";
import { EucharisticPrayerBrowser } from "./eucharistic-prayer-browser";
import { SectionNotes } from "./section-notes";

interface SectionInlineControlProps {
  section: ServiceSection;
  churchId: string;
}

export function SectionInlineControl({ section, churchId }: SectionInlineControlProps) {
  const { musicSlotType, musicSlotId, placeholderType } = section;

  return (
    <div className="space-y-1">
      {/* Music slot controls */}
      {musicSlotType === "HYMN" && musicSlotId && (
        <HymnPicker slotId={musicSlotId} churchId={churchId} />
      )}

      {musicSlotType?.startsWith("MASS_SETTING_") && musicSlotId && (
        <MassSettingControl
          slotId={musicSlotId}
          churchId={churchId}
          musicSlotType={musicSlotType}
        />
      )}

      {musicSlotType === "ANTHEM" && (
        <span className="text-xs text-muted-foreground italic">Anthem</span>
      )}

      {musicSlotType &&
        musicSlotType !== "HYMN" &&
        !musicSlotType.startsWith("MASS_SETTING_") &&
        musicSlotType !== "ANTHEM" && (
          <span className="text-xs text-muted-foreground italic">
            {musicSlotType.replace(/_/g, " ").toLowerCase()}
          </span>
        )}

      {/* Placeholder controls */}
      {placeholderType === "collect" && (
        <CollectChooser churchId={churchId} />
      )}

      {placeholderType === "eucharistic-prayer" && (
        <EucharisticPrayerBrowser />
      )}

      {/* Section notes (always available) */}
      <SectionNotes sectionId={section.id} />
    </div>
  );
}
