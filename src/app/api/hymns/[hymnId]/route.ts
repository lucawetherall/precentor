import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { hymns, hymnVerses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hymnId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hymnId } = await params;

  const result = await db
    .select()
    .from(hymns)
    .where(eq(hymns.id, hymnId))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hymn = result[0];

  // Count verses
  const verses = await db
    .select()
    .from(hymnVerses)
    .where(eq(hymnVerses.hymnId, hymnId));

  return NextResponse.json({
    ...hymn,
    totalVerses: verses.length,
  });
}
