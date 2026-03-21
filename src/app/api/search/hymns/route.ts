import { NextRequest, NextResponse } from "next/server";
import { searchHymns } from "@/lib/search/hymns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const book = searchParams.get("book") as "NEH" | "AM" | undefined;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  if (q.length > 256) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await searchHymns(q, book || undefined);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Hymn search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
