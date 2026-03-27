import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { collects } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const url = new URL(request.url);
  const liturgicalDayId = url.searchParams.get("liturgicalDayId");

  const conditions = [
    or(isNull(collects.churchId), eq(collects.churchId, churchId)),
  ];

  if (liturgicalDayId) {
    conditions.push(eq(collects.liturgicalDayId, liturgicalDayId));
  }

  const results = await db.select().from(collects).where(and(...conditions));
  return NextResponse.json(results);
}
