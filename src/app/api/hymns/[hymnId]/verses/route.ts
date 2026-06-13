import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hymnVerses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/permissions";
import { uuidSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hymnId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { hymnId } = await params;
  // A malformed UUID can't reference an existing row; unvalidated it surfaces
  // as a DB-level 500.
  if (!uuidSchema.safeParse(hymnId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const verses = await db
    .select()
    .from(hymnVerses)
    .where(eq(hymnVerses.hymnId, hymnId))
    .orderBy(hymnVerses.verseNumber);

  return NextResponse.json(verses);
}
