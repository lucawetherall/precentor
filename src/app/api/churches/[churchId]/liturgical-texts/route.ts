import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { liturgicalTexts } from "@/lib/db/schema";
import { ilike, or } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  let rows;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = await db
      .select({
        id: liturgicalTexts.id,
        key: liturgicalTexts.key,
        title: liturgicalTexts.title,
        rite: liturgicalTexts.rite,
        category: liturgicalTexts.category,
      })
      .from(liturgicalTexts)
      .where(
        or(
          ilike(liturgicalTexts.title, term),
          ilike(liturgicalTexts.category, term)
        )
      )
      .orderBy(liturgicalTexts.title);
  } else {
    rows = await db
      .select({
        id: liturgicalTexts.id,
        key: liturgicalTexts.key,
        title: liturgicalTexts.title,
        rite: liturgicalTexts.rite,
        category: liturgicalTexts.category,
      })
      .from(liturgicalTexts)
      .orderBy(liturgicalTexts.title);
  }

  return NextResponse.json(rows);
}
