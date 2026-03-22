import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { MusicSlotEntry, TemplateLayout } from "@/types/service-sheet";
import type { PdfStyles } from "../create-styles";
import { MUSIC_SLOT_LABELS } from "@/types";

interface MusicSlotRowProps {
  slot: MusicSlotEntry;
  layout: TemplateLayout;
  styles: PdfStyles;
}

export function MusicSlotRow({ slot, layout, styles }: MusicSlotRowProps) {
  const label =
    (MUSIC_SLOT_LABELS as Record<string, string>)[slot.slotType] || slot.label;

  let displayValue = slot.value;
  if (slot.hymn) {
    if (layout.hymnDisplay === "number-title-tune") {
      const parts = [`${slot.hymn.book} ${slot.hymn.number}`];
      if (slot.hymn.firstLine) parts.push(slot.hymn.firstLine);
      if (slot.hymn.tuneName) parts.push(`(${slot.hymn.tuneName})`);
      displayValue = parts.join(" — ");
    }
  } else if (slot.anthem) {
    displayValue = `${slot.anthem.title} — ${slot.anthem.composer}`;
    if (slot.anthem.voicing) displayValue += ` (${slot.anthem.voicing})`;
  } else if (slot.massSetting) {
    displayValue = `${slot.massSetting.name} — ${slot.massSetting.composer}`;
  } else if (slot.canticleSetting) {
    displayValue = `${slot.canticleSetting.name} — ${slot.canticleSetting.composer}`;
  } else if (slot.responsesSetting) {
    displayValue = `${slot.responsesSetting.name} — ${slot.responsesSetting.composer}`;
  }

  return (
    <View style={styles.slotRow}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={styles.slotValue}>
        {displayValue}
        {slot.notes ? (
          <Text style={styles.slotNotes}>{` (${slot.notes})`}</Text>
        ) : null}
      </Text>
    </View>
  );
}
