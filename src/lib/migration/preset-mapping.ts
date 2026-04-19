export type ServiceTypeKey = "SUNG_EUCHARIST" | "CHORAL_EVENSONG" | "SAID_EUCHARIST" | "CHORAL_MATINS" | "FAMILY_SERVICE" | "COMPLINE" | "CUSTOM";
export type ChoirStatusKey = "CHOIR_REQUIRED" | "NO_CHOIR_NEEDED" | "SAID_SERVICE_ONLY" | "NO_SERVICE";
export type PresetKey = "DEFAULT_CHORAL" | "ORGANIST_ONLY_EUCHARIST" | "SAID_EUCHARIST";

export function mapServiceTypeAndChoirStatusToPresetKey(
  serviceType: ServiceTypeKey,
  choirStatus: ChoirStatusKey,
): PresetKey {
  if (choirStatus === "SAID_SERVICE_ONLY") return "SAID_EUCHARIST";
  if (choirStatus === "NO_CHOIR_NEEDED") return "ORGANIST_ONLY_EUCHARIST";
  if (serviceType === "SAID_EUCHARIST") return "SAID_EUCHARIST";
  return "DEFAULT_CHORAL";
}

export function resolveDefaultTime(times: Array<string | null>): { time: string | null; ambiguous: boolean } {
  const distinct = new Set(times.filter((t): t is string => !!t));
  if (distinct.size === 0) return { time: null, ambiguous: false };
  if (distinct.size === 1) return { time: distinct.values().next().value!, ambiguous: false };
  return { time: null, ambiguous: true };
}
