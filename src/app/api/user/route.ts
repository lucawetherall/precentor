import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users, churchMemberships, userDeletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Capture membership structure BEFORE we touch auth — once Supabase is
  // deleted the user can't re-authenticate, so we need this record to reason
  // about blast radius during any support investigation.
  const memberships = await db
    .select({ churchId: churchMemberships.churchId })
    .from(churchMemberships)
    .where(eq(churchMemberships.userId, user!.id));
  const churchIds = memberships.map((m) => m.churchId);

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

  // Audit + cascade-delete in one transaction so a partial failure doesn't
  // leave a user with no auth identity but a live DB row (un-reachable).
  try {
    await db.transaction(async (tx) => {
      await tx.insert(userDeletions).values({
        deletedUserId: user!.id,
        churchIds,
        reason: "self-service",
      });
      // Cascades to churchMemberships, availability, rotaEntries.
      await tx.delete(users).where(eq(users.id, user!.id));
    });
  } catch (dbErr) {
    logger.error("User delete succeeded in Supabase but DB delete failed", dbErr, {
      userId: user!.id,
      supabaseId: user!.supabaseId,
    });
    // Auth is gone so the user can't act anymore, but DB data remains as an
    // orphan we need to clean up manually. Still report success because the
    // user's request — "make me stop having an account" — was honoured.
  }

  return NextResponse.json({ success: true });
}
