import "server-only";

import { redirect } from "next/navigation";
import {
  getAuthUser,
  getChurchMembership,
  hasMinRole,
  coerceMemberRole,
} from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";
import type { users, churchMemberships } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export interface PageAuthOptions {
  churchId?: string;
  /** EDITOR or ADMIN; omit for any membership. Ignored when churchId is omitted. */
  role?: MemberRole;
}

export interface PageAuthResult {
  user: InferSelectModel<typeof users>;
  membership: InferSelectModel<typeof churchMemberships> | null;
}

/**
 * Single entry point for page-level auth + role gating.
 *
 * Replaces the three different ad-hoc patterns the audit found across pages
 * (raw `supabase.auth.getUser()` + manual DB lookup + manual redirect choice).
 * Centralising the redirect-destination logic prevents bugs like sending
 * authenticated-but-unauthorized users to `/login` (which middleware bounces
 * to `/dashboard` — a confusing UX loop).
 *
 * Behaviour:
 * - No session                         → `redirect("/login")`
 * - Session but no DB user row         → `redirect("/login")` (failed signup recovery)
 * - `churchId` given but no membership → `redirect("/churches")`
 * - `role` given but role gate fails   → `redirect("/churches/{churchId}")`
 * - All checks pass                    → returns `{ user, membership }`
 *
 * **Important:** this function calls `redirect()` internally, which throws
 * `NEXT_REDIRECT`. **Do not wrap calls to `requirePageAuth` in `try/catch`**
 * — the redirect will be swallowed silently. The custom ESLint rule
 * `precentor/no-redirect-in-try` cannot detect this case across function
 * boundaries; it is a convention. See `docs/conventions.md`.
 */
export async function requirePageAuth(
  opts: PageAuthOptions = {},
): Promise<PageAuthResult> {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  if (!opts.churchId) {
    return { user, membership: null };
  }

  const membership = await getChurchMembership(user.id, opts.churchId);
  if (!membership) redirect("/churches");

  if (opts.role) {
    const role = coerceMemberRole(membership.role);
    if (!hasMinRole(role, opts.role)) {
      redirect(`/churches/${opts.churchId}`);
    }
  }

  return { user, membership };
}
