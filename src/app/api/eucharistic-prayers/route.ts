import { db } from "@/lib/db";
import { eucharisticPrayers } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const prayers = await db.select().from(eucharisticPrayers);
  return NextResponse.json(prayers);
}
