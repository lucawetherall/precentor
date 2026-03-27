export function resolveCollectText(
  collectOverride: string | null,
  collectText: string | null, // from collects table via collectId
  liturgicalDayCollect: string | null, // fallback from liturgical_days.collect
): string | null {
  if (collectOverride) return collectOverride;
  if (collectText) return collectText;
  return liturgicalDayCollect;
}
