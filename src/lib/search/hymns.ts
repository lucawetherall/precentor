import { db } from "@/lib/db";
import { hymns, hymnVerses } from "@/lib/db/schema";
import { ilike, or, eq, and, inArray, sql, type SQL } from "drizzle-orm";

function escapeLike(str: string): string {
  return str.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchHymns(query: string, book?: "NEH" | "AM", offset = 0) {
  const escaped = escapeLike(query);
  const conditions: SQL[] = [
    ilike(hymns.firstLine, `%${escaped}%`),
    ilike(hymns.tuneName, `%${escaped}%`),
    ilike(hymns.author, `%${escaped}%`),
  ];

  // Match by number if query is numeric
  if (!isNaN(Number(query))) {
    conditions.push(eq(hymns.number, Number(query)));
  }

  const whereClause = book
    ? and(or(...conditions), eq(hymns.book, book))
    : or(...conditions);

  const rows = await db
    .select()
    .from(hymns)
    .where(whereClause!)
    .offset(offset)
    .limit(20);

  if (rows.length === 0) return [];

  // Fetch verse counts for all returned hymns in one query
  const hymnIds = rows.map((h) => h.id);
  const verseCounts = await db
    .select({
      hymnId: hymnVerses.hymnId,
      totalVerses: sql<number>`count(*)`.as("total_verses"),
    })
    .from(hymnVerses)
    .where(inArray(hymnVerses.hymnId, hymnIds))
    .groupBy(hymnVerses.hymnId);

  const verseCountMap = new Map<string, number>(
    verseCounts.map((v) => [v.hymnId, Number(v.totalVerses)])
  );

  return rows.map((hymn) => ({
    ...hymn,
    totalVerses: verseCountMap.get(hymn.id) ?? 0,
  }));
}
