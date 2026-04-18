import type { ServiceType } from "@/types";

export type ChoirStatus =
  | "CHOIR_REQUIRED"
  | "NO_CHOIR_NEEDED"
  | "SAID_SERVICE_ONLY"
  | "NO_SERVICE";

/**
 * Resolve the music-list service label for a (serviceType, choirStatus) pair.
 *
 * Said variants:
 *  - SUNG_EUCHARIST + SAID_SERVICE_ONLY → "Said Mass"
 *  - CHORAL_EVENSONG + SAID_SERVICE_ONLY → "Said Evensong"
 *  - SAID_EUCHARIST is always "Said Mass" regardless of status
 */
export function serviceTypeLabelFor(
  serviceType: ServiceType,
  choirStatus: ChoirStatus,
): string {
  const isSaid = choirStatus === "SAID_SERVICE_ONLY";

  switch (serviceType) {
    case "SUNG_EUCHARIST":
      return isSaid ? "Said Mass" : "Sung Mass";
    case "CHORAL_EVENSONG":
      return isSaid ? "Said Evensong" : "Choral Evensong";
    case "SAID_EUCHARIST":
      return "Said Mass";
    case "CHORAL_MATINS":
      return "Choral Matins";
    case "FAMILY_SERVICE":
      return "Family Service";
    case "COMPLINE":
      return "Compline";
    case "CUSTOM":
      return "Service";
    default: {
      const _exhaustive: never = serviceType;
      return _exhaustive;
    }
  }
}
