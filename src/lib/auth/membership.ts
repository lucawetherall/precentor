import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 3,
  EDITOR: 2,
  MEMBER: 1,
};

export type MemberRole = "ADMIN" | "EDITOR" | "MEMBER";

export async function requireMembership(
  supabaseUserId: string,
  churchId: string,
  minRole: MemberRole = "MEMBER"
) {
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, supabaseUserId))
    .limit(1);

  if (dbUser.length === 0) {
    return { error: "User not found", status: 404 as const };
  }

  const membership = await db
    .select()
    .from(churchMemberships)
    .where(
      and(
        eq(churchMemberships.userId, dbUser[0].id),
        eq(churchMemberships.churchId, churchId)
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return { error: "Forbidden", status: 403 as const };
  }

  const userRoleLevel = ROLE_HIERARCHY[membership[0].role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userRoleLevel < requiredLevel) {
    return { error: "Insufficient permissions", status: 403 as const };
  }

  return { user: dbUser[0], membership: membership[0] };
}

// Enum validators
export const VALID_ROLES = ["ADMIN", "EDITOR", "MEMBER"] as const;
export const VALID_SERVICE_TYPES = [
  "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST", "CHORAL_MATINS",
  "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
] as const;
export const VALID_SLOT_TYPES = [
  "HYMN", "PSALM", "ANTHEM", "MASS_SETTING_GLORIA", "MASS_SETTING_SANCTUS",
  "MASS_SETTING_AGNUS", "MASS_SETTING_GLOBAL", "ORGAN_VOLUNTARY_PRE",
  "ORGAN_VOLUNTARY_POST", "ORGAN_VOLUNTARY_OFFERTORY", "CANTICLE_MAGNIFICAT",
  "CANTICLE_NUNC_DIMITTIS", "RESPONSES", "GOSPEL_ACCLAMATION", "OTHER",
] as const;
export const VALID_AVAILABILITY_STATUSES = ["AVAILABLE", "UNAVAILABLE", "TENTATIVE"] as const;
export const VALID_SEASONS = [
  "ADVENT", "CHRISTMAS", "EPIPHANY", "LENT", "HOLY_WEEK", "EASTER",
  "ASCENSION", "PENTECOST", "TRINITY", "ORDINARY", "KINGDOM",
] as const;
export const VALID_COLOURS = ["PURPLE", "WHITE", "GOLD", "GREEN", "RED", "ROSE"] as const;
export const VALID_LECTIONARIES = ["PRINCIPAL", "SECOND", "THIRD"] as const;
export const VALID_READING_POSITIONS = ["OLD_TESTAMENT", "PSALM", "EPISTLE", "GOSPEL", "CANTICLE"] as const;

export function isValidEnum<T extends readonly string[]>(value: unknown, validValues: T): value is T[number] {
  return typeof value === "string" && (validValues as readonly string[]).includes(value);
}
