import { DEFAULT_LECTIONARY_TRACK, type LectionaryTrack } from "@/lib/churches/settings";

/**
 * Resolve which Ordinary Time psalm track a service should display:
 * per-service override → church default → CONTINUOUS.
 */
export function resolveLectionaryTrack(
  serviceOverride: string | null | undefined,
  churchDefault: LectionaryTrack | null | undefined,
): LectionaryTrack {
  if (serviceOverride === "CONTINUOUS" || serviceOverride === "RELATED") return serviceOverride;
  return churchDefault ?? DEFAULT_LECTIONARY_TRACK;
}

/**
 * Filter a day's readings to the active psalm track. Only psalms are
 * track-tagged, so this keeps every non-psalm reading (OT, epistle, gospel,
 * and all non-Ordinary days) plus the chosen track's psalm, dropping the other
 * track's psalm. Days with no track-tagged psalm are returned unchanged.
 */
export function filterReadingsByTrack<T extends { track?: string | null }>(
  readings: T[],
  active: LectionaryTrack,
): T[] {
  const hasTracks = readings.some(
    (r) => r.track === "CONTINUOUS" || r.track === "RELATED",
  );
  if (!hasTracks) return readings;
  return readings.filter((r) => !r.track || r.track === active);
}

/** Whether a day offers a Continuous/Related psalm choice (Ordinary Time). */
export function hasTrackChoice<T extends { track?: string | null }>(
  readings: T[],
): boolean {
  return readings.some((r) => r.track === "CONTINUOUS" || r.track === "RELATED");
}
