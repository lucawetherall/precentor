"use client";

import { Plus } from "lucide-react";
import type { ServiceSection } from "./section-row";
import { MUSIC_SLOT_LABELS } from "@/types";
import type { MusicSlotType } from "@/types";
import { HymnPicker } from "./hymn-picker";
import { MassSettingControl } from "./mass-setting-control";
import { CollectChooser } from "./collect-chooser";
import { EucharisticPrayerBrowser } from "./eucharistic-prayer-browser";
import { SectionNotes } from "./section-notes";
import { useServiceEditor } from "./service-editor-context";

interface SectionInlineControlProps {
  section: ServiceSection;
  churchId: string;
}

export function SectionInlineControl({ section, churchId }: SectionInlineControlProps) {
  const { musicSlotType, musicSlotId, placeholderType } = section;
  const { addSection, sections } = useServiceEditor();

  const handleAddCommunionMusic = () => {
    // Use max of all current section positions to avoid collisions on repeated clicks
    const maxPosition = sections.reduce((m, s) => Math.max(m, s.positionOrder), 0)
    addSection({
      sectionKey: "communion.communion_music",
      title: "Communion Music",
      musicSlotType: "HYMN",
      placeholderType: "communion-music",
      positionOrder: maxPosition + 1,
      majorSection: null,
      liturgicalTextId: null,
      musicSlotId: null,
      placeholderValue: null,
      textOverride: null,
      visible: true,
      notes: null,
    });
  };

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
            {MUSIC_SLOT_LABELS[musicSlotType as MusicSlotType] ?? musicSlotType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}

      {/* Placeholder controls */}
      {placeholderType === "collect" && (
        <CollectChooser churchId={churchId} />
      )}

      {placeholderType === "eucharistic-prayer" && (
        <EucharisticPrayerBrowser />
      )}

      {/* Add another communion music slot */}
      {placeholderType === "communion-music" && (
        <button
          onClick={handleAddCommunionMusic}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Add another Communion Music slot"
          aria-label="Add another Communion Music"
        >
          <Plus className="h-3 w-3" />
          Add another
        </button>
      )}

      {/* Section notes (always available) */}
      <SectionNotes sectionId={section.id} />
    </div>
  );
}
