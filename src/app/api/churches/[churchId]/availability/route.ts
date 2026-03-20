import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, serviceId, status } = body;

  try {
    await db
      .insert(availability)
      .values({
        userId,
        serviceId,
        status: status as any,
      })
      .onConflictDoUpdate({
        target: [availability.userId, availability.serviceId],
        set: { status: status as any },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
