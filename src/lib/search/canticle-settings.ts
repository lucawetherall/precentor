import { db } from "@/lib/db";
import { canticleSettings } from "@/lib/db/schema";
import { ilike, or, eq, and, isNull, type SQL } from "drizzle-orm";

function escapeLike(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchCanticleSettings(query: string, churchId?: string, offset = 0) {
  const escaped = escapeLike(query);
  const searchConditions: SQL[] = [
    ilike(canticleSettings.name, `%${escaped}%`),
    ilike(canticleSettings.composer, `%${escaped}%`),
  ];

  const searchClause = or(...searchConditions);

  // Filter: church-specific or global (churchId IS NULL)
  const scopeClause = churchId
    ? or(eq(canticleSettings.churchId, churchId), isNull(canticleSettings.churchId))
    : isNull(canticleSettings.churchId);

  return db
    .select({
      id: canticleSettings.id,
      name: canticleSettings.name,
      composer: canticleSettings.composer,
      key: canticleSettings.key,
      canticle: canticleSettings.canticle,
    })
    .from(canticleSettings)
    .where(and(searchClause, scopeClause)!)
    .offset(offset)
    .limit(8);
}
