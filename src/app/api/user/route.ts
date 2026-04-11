import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Delete from DB first — cascades to churchMemberships, availability, rotaEntries
  await db.delete(users).where(eq(users.id, user!.id));

  // Delete from Supabase Auth (requires service role)
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(user!.supabaseId);

  if (authError) {
    // DB record already deleted; auth orphan cannot log in, log for monitoring
    console.error("Failed to delete Supabase auth user:", authError.message);
  }

  return NextResponse.json({ success: true });
}
