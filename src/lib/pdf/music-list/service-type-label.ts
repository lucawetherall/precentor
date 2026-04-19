import type { ServiceType } from "@/types";

/**
 * Resolve the music-list service label for a serviceType.
 *
 * The choirStatus concept has been removed in Phase D — service type alone
 * now determines the label. SAID_EUCHARIST services use the "Said Mass" label
 * natively; "Sung Mass" etc. come from the serviceType enum.
 */
export function serviceTypeLabelFor(
  serviceType: ServiceType,
): string {
  switch (serviceType) {
    case "SUNG_EUCHARIST":
      return "Sung Mass";
    case "CHORAL_EVENSONG":
      return "Choral Evensong";
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
