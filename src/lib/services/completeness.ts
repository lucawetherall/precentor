export type CompletenessStatus = "complete" | "partial" | "empty";

export function calculateCompleteness(sections: {
  musicSlotType: string | null;
  musicSlotId: string | null;
  placeholderType: string | null;
  placeholderValue: string | null;
  visible: boolean;
}[]): CompletenessStatus {
  const visibleSections = sections.filter(s => s.visible);
  const musicSections = visibleSections.filter(s => s.musicSlotType);
  const filledMusic = musicSections.filter(s => s.musicSlotId);
  const placeholders = visibleSections.filter(s => s.placeholderType);
  const resolvedPlaceholders = placeholders.filter(s => s.placeholderValue);

  const total = musicSections.length + placeholders.length;
  const filled = filledMusic.length + resolvedPlaceholders.length;

  if (total === 0) return "empty";
  if (filled === 0) return "empty";
  if (filled === total) return "complete";
  return "partial";
}
