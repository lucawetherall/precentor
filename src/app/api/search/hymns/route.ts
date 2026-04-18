import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchHymns } from "@/lib/search/hymns";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await rateLimit(`hymn-search:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const book = searchParams.get("book") as "NEH" | "AM" | undefined;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 1000) : 0;

  try {
    const results = await searchHymns(q, book || undefined, offset);
    return NextResponse.json({ results, hasMore: results.length === 20 });
  } catch (err) {
    logger.error("Hymn search failed", err, { query: q, book });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
