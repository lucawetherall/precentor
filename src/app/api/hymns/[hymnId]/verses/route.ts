import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hymnVerses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hymnId: string }> }
) {
  const { hymnId } = await params;

  const verses = await db
    .select()
    .from(hymnVerses)
    .where(eq(hymnVerses.hymnId, hymnId))
    .orderBy(hymnVerses.verseNumber);

  return NextResponse.json(verses);
}
