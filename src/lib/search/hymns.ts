import { db } from "@/lib/db";
import { hymns } from "@/lib/db/schema";
import { ilike, or, eq, and, type SQL } from "drizzle-orm";

export async function searchHymns(query: string, book?: "NEH" | "AM") {
  const conditions: SQL[] = [
    ilike(hymns.firstLine, `%${query}%`),
    ilike(hymns.tuneName, `%${query}%`),
  ];

  if (hymns.author) {
    conditions.push(ilike(hymns.author, `%${query}%`));
  }

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
    .limit(20);
}
