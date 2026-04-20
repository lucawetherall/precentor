import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hymnVerses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hymnId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { hymnId } = await params;

  const verses = await db
    .select()
    .from(hymnVerses)
    .where(eq(hymnVerses.hymnId, hymnId))
    .orderBy(hymnVerses.verseNumber);

  return NextResponse.json(verses);
}
