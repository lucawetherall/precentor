import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchCanticleSettings } from "@/lib/search/canticle-settings";
import { requireChurchRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await rateLimit(`canticle-setting-search:${user.id}`, { maxRequests: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const churchId = searchParams.get("churchId") || undefined;

  if (churchId) {
    const { error } = await requireChurchRole(churchId, "MEMBER");
    if (error) return error;
  }

  if (q.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await searchCanticleSettings(q, churchId);
    return NextResponse.json({ results });
  } catch (err) {
    logger.error("Canticle setting search failed", err, { query: q, churchId });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
