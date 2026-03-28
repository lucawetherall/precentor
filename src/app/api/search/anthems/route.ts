import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAnthems } from "@/lib/search/anthems";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const churchId = searchParams.get("churchId") || undefined;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 1000) : 0;

  try {
    const results = await searchAnthems(q, churchId, offset);
    return NextResponse.json({ results, hasMore: results.length === 20 });
  } catch (_error) {
    return NextResponse.json([], { status: 200 });
  }
}
