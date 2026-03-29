/**
 * Select which verse numbers to include for a hymn.
 * Always preserves first and last verse, evenly spacing the middle.
 * Choruses/refrains are handled separately (they appear after each selected verse).
 */
export function selectVerses(
  totalVerses: number,
  requestedCount: number,
  explicitSelection?: number[] | null,
): number[] {
  if (explicitSelection && explicitSelection.length > 0) {
    return explicitSelection;
  }

  if (totalVerses <= 0) return [];
  if (requestedCount <= 0) return [];
  if (requestedCount >= totalVerses) {
    return Array.from({ length: totalVerses }, (_, i) => i + 1);
  }

  if (requestedCount === 1) return [1];

  const result: number[] = [1];
  const remaining = requestedCount - 2; // minus first and last

  if (remaining > 0) {
    const step = (totalVerses - 1) / (requestedCount - 1);
    for (let i = 1; i <= remaining; i++) {
      const verse = Math.floor(1 + i * step);
      // Avoid duplicates with first verse
      if (verse > 1 && verse < totalVerses) {
        result.push(verse);
      }
    }
  }

  result.push(totalVerses);
  return [...new Set(result)];
}
