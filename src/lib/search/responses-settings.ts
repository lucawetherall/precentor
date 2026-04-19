import { db } from "@/lib/db";
import { responsesSettings } from "@/lib/db/schema";
import { ilike, or, eq, and, isNull, type SQL } from "drizzle-orm";

function escapeLike(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchResponsesSettings(query: string, churchId?: string, offset = 0) {
  const escaped = escapeLike(query);
  const searchConditions: SQL[] = [
    ilike(responsesSettings.name, `%${escaped}%`),
    ilike(responsesSettings.composer, `%${escaped}%`),
  ];

  const searchClause = or(...searchConditions);

  // Filter: church-specific or global (churchId IS NULL)
  const scopeClause = churchId
    ? or(eq(responsesSettings.churchId, churchId), isNull(responsesSettings.churchId))
    : isNull(responsesSettings.churchId);

  return db
    .select({
      id: responsesSettings.id,
      name: responsesSettings.name,
      composer: responsesSettings.composer,
    })
    .from(responsesSettings)
    .where(and(searchClause, scopeClause)!)
    .offset(offset)
    .limit(8);
}
