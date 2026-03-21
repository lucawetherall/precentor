import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { requireMembership, VALID_AVAILABILITY_STATUSES, isValidEnum } from "@/lib/auth/membership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authResult = await requireMembership(user.id, churchId, "MEMBER");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const { serviceId, status } = body;

  if (!isValidEnum(status, VALID_AVAILABILITY_STATUSES)) {
    return NextResponse.json({ error: "Invalid availability status" }, { status: 400 });
  }

  try {
    await db
      .insert(availability)
      .values({
        userId: authResult.user.id,
        serviceId,
        status,
      })
      .onConflictDoUpdate({
        target: [availability.userId, availability.serviceId],
        set: { status },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
