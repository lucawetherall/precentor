import { NextRequest, NextResponse } from "next/server";
import { searchHymns } from "@/lib/search/hymns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const book = searchParams.get("book") as "NEH" | "AM" | undefined;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchHymns(q, book || undefined);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
