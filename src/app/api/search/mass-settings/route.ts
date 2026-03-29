import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMassSettings } from "@/lib/search/mass-settings";
import { requireChurchRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const churchId = searchParams.get("churchId") || "";

  if (!churchId) {
    return NextResponse.json({ error: "churchId is required" }, { status: 400 });
  }

  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 1000) : 0;

  try {
    const results = await searchMassSettings(q, churchId, offset);
    return NextResponse.json({ results, hasMore: results.length === 20 });
  } catch (err) {
    logger.error("Mass setting search failed", err, { query: q, churchId });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
