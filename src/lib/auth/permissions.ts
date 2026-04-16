import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { MemberRole } from "@/types";

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  MEMBER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

export const VALID_MEMBER_ROLES = Object.keys(ROLE_HIERARCHY) as MemberRole[];

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && value in ROLE_HIERARCHY;
}

/**
 * Coerce a DB-returned string to a MemberRole, defaulting to the least
 * privileged role if the value is unexpected. We log so corrupted rows
 * surface in monitoring rather than silently failing open.
 */
export function coerceMemberRole(value: unknown): MemberRole {
  if (isMemberRole(value)) return value;
  console.warn("[permissions] Unexpected role value — defaulting to MEMBER", { value });
  return "MEMBER";
}

export function hasMinRole(userRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, user.id))
    .limit(1);

  if (dbUser.length === 0) return null;
  return dbUser[0];
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireChurchRole(churchId: string, minRole: MemberRole) {
  const { user, error } = await requireAuth();
  if (error) return { user: null, membership: null, error };

  const membership = await db
    .select()
    .from(churchMemberships)
    .where(
      and(
        eq(churchMemberships.userId, user!.id),
        eq(churchMemberships.churchId, churchId)
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Not a member of this church" }, { status: 403 }),
    };
  }

  if (!hasMinRole(coerceMemberRole(membership[0].role), minRole)) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  return { user: user!, membership: membership[0], error: null };
}
