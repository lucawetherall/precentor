import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Delete Supabase Auth identity FIRST so the user can no longer log in.
  // If we delete from the DB first and the Supabase call fails, the user
  // retains a valid session but every request fails with "user not found" —
  // a worse outcome than leaving orphaned DB rows we can clean up later.
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(user!.supabaseId);

  if (authError) {
    logger.error("Failed to delete Supabase auth user", authError, {
      userId: user!.id,
      supabaseId: user!.supabaseId,
    });
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 502 },
    );
  }

  // Cascades to churchMemberships, availability, rotaEntries.
  await db.delete(users).where(eq(users.id, user!.id));

  return NextResponse.json({ success: true });
}
