import { db } from "@/lib/db";
import { eucharisticPrayers } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const prayers = await db.select().from(eucharisticPrayers);
  return NextResponse.json(prayers);
}
