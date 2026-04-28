import "server-only";

import { cache } from "react";
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

export function coerceMemberRole(value: unknown): MemberRole {
  if (isMemberRole(value)) return value;
  console.warn("[permissions] Unexpected role value — defaulting to MEMBER", { value });
  return "MEMBER";
}

export function hasMinRole(userRole: MemberRole, minRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Cheap Supabase-only check. Use in places that only need to know whether
 * the request is authenticated — no DB row required. Cached per request.
 *
 * The `(app)/layout.tsx` uses this so a freshly-signed-up user whose DB
 * upsert in /auth/callback failed (handled with try/catch there) still
 * gets past the layout guard and can attempt page-level operations,
 * matching prior behaviour.
 */
export const getSupabaseUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Full auth: Supabase user + matching `users` row. Cached per request,
 * so combining `getSupabaseUser` + `getAuthUser` in the same render does
 * not incur duplicate Supabase round-trips.
 */
export const getAuthUser = cache(async () => {
  const user = await getSupabaseUser();
  if (!user) return null;

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, user.id))
    .limit(1);

  if (dbUser.length === 0) return null;
  return dbUser[0];
});

/**
 * Wrapped in React.cache for the same reason. Keyed on (userId, churchId).
 */
export const getChurchMembership = cache(
  async (userId: string, churchId: string) => {
    const rows = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, userId),
          eq(churchMemberships.churchId, churchId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },
);

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

  const membership = await getChurchMembership(user!.id, churchId);

  if (!membership) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Not a member of this church" }, { status: 403 }),
    };
  }

  if (!hasMinRole(coerceMemberRole(membership.role), minRole)) {
    return {
      user: null,
      membership: null,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  return { user: user!, membership, error: null };
}
