import { db } from "@/lib/db";
import { anthems } from "@/lib/db/schema";
import { ilike, or, eq, and, isNull, type SQL } from "drizzle-orm";

export async function searchAnthems(query: string, churchId?: string, offset = 0) {
  const searchConditions: SQL[] = [
    ilike(anthems.title, `%${query}%`),
    ilike(anthems.composer, `%${query}%`),
  ];

  const searchClause = or(...searchConditions);

  // Filter: church-specific or global (churchId IS NULL)
  const scopeClause = churchId
    ? or(eq(anthems.churchId, churchId), isNull(anthems.churchId))
    : isNull(anthems.churchId);

  return db
    .select()
    .from(anthems)
    .where(and(searchClause, scopeClause)!)
    .offset(offset)
    .limit(20);
}
