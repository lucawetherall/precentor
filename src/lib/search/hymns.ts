import { db } from "@/lib/db";
import { hymns } from "@/lib/db/schema";
import { ilike, or, eq, and, type SQL } from "drizzle-orm";

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

  return db
    .select()
    .from(hymns)
    .where(whereClause!)
    .offset(offset)
    .limit(20);
}
