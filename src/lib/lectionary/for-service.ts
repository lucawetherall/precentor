import type { ServiceType } from "@/types";

/**
 * Which Common Worship lectionary a service type reads from.
 * Evensong uses the Second Service lectionary; everything else the Principal.
 * Single source of truth — the readings panel and the PDF builders must agree,
 * otherwise printed sheets show different lessons than the planning UI.
 */
export function lectionaryForServiceType(
  serviceType: ServiceType | string,
): "PRINCIPAL" | "SECOND" {
  return serviceType === "CHORAL_EVENSONG" ? "SECOND" : "PRINCIPAL";
}
