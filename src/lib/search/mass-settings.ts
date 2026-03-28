import { db } from "@/lib/db";
import { massSettings, churchMassSettings } from "@/lib/db/schema";
import { ilike, or, eq, and, type SQL } from "drizzle-orm";

function escapeLike(str: string): string {
  return str.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchMassSettings(query: string, churchId: string, offset = 0) {
  const escaped = escapeLike(query);
  const searchConditions: SQL[] = [
    ilike(massSettings.name, `%${escaped}%`),
    ilike(massSettings.composer, `%${escaped}%`),
  ];

  const searchClause = or(...searchConditions);

  // Only return mass settings linked to this church
  return db
    .select({
      id: massSettings.id,
      name: massSettings.name,
      composer: massSettings.composer,
      movements: massSettings.movements,
    })
    .from(massSettings)
    .innerJoin(
      churchMassSettings,
      eq(massSettings.id, churchMassSettings.massSettingId)
    )
    .where(and(searchClause, eq(churchMassSettings.churchId, churchId))!)
    .offset(offset)
    .limit(20);
}
