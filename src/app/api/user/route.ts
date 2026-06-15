import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users, churches, churchMemberships, userDeletions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Capture membership structure BEFORE we touch auth — once Supabase is
  // deleted the user can't re-authenticate, so we need this record to reason
  // about blast radius during any support investigation.
  const memberships = await db
    .select({ churchId: churchMemberships.churchId, role: churchMemberships.role })
    .from(churchMemberships)
    .where(eq(churchMemberships.userId, user!.id));
  const churchIds = memberships.map((m) => m.churchId);

  // Refuse deletion while this user is the sole ADMIN of a church that still
  // has other members — deleting them would strand those members with no one
  // able to manage the church (mirrors the last-admin guard on member
  // removal). A church where they are the only member can be orphaned freely:
  // nobody is left behind.
  const adminChurchIds = memberships.filter((m) => m.role === "ADMIN").map((m) => m.churchId);
  if (adminChurchIds.length > 0) {
    const rows = await db
      .select({
        churchId: churchMemberships.churchId,
        userId: churchMemberships.userId,
        role: churchMemberships.role,
        churchName: churches.name,
      })
      .from(churchMemberships)
      .innerJoin(churches, eq(churchMemberships.churchId, churches.id))
      .where(inArray(churchMemberships.churchId, adminChurchIds));

    const blockedChurchNames: string[] = [];
    for (const churchId of adminChurchIds) {
      const members = rows.filter((r) => r.churchId === churchId);
      const others = members.filter((r) => r.userId !== user!.id);
      const otherAdmins = others.filter((r) => r.role === "ADMIN");
      if (others.length > 0 && otherAdmins.length === 0) {
        blockedChurchNames.push(members[0]?.churchName ?? churchId);
      }
    }
    if (blockedChurchNames.length > 0) {
      return NextResponse.json(
        {
          error: `You are the only admin of ${blockedChurchNames.join(", ")}. Transfer the admin role to another member, or remove the other members, before deleting your account.`,
        },
        { status: 409 },
      );
    }
  }

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
