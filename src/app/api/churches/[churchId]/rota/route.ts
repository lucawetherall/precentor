import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rotaEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireMembership } from "@/lib/auth/membership";

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

  const authResult = await requireMembership(user.id, churchId, "EDITOR");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const { userId, serviceId, confirmed } = body;

  try {
    if (confirmed) {
      await db
        .insert(rotaEntries)
        .values({ userId, serviceId, confirmed: true })
        .onConflictDoUpdate({
          target: [rotaEntries.serviceId, rotaEntries.userId],
          set: { confirmed: true },
        });
    } else {
      await db
        .delete(rotaEntries)
        .where(
          and(
            eq(rotaEntries.userId, userId),
            eq(rotaEntries.serviceId, serviceId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update rota:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
