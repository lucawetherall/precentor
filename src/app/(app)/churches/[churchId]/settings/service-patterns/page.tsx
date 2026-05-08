import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  churchMemberships,
  users,
  churchServicePatterns,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { ServicePatternsClient } from "./service-patterns-client";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ServicePatternsPage({ params }: Props) {
  const { churchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ADMIN role. redirect() throws NEXT_REDIRECT; do the lookups in a
  // try/catch (so a transient DB error doesn't crash the page) but call
  // redirect() *after* the try/catch so the throw propagates correctly.
  let dbUserId: string | null = null;
  let role: ReturnType<typeof coerceMemberRole> | null = null;
  let lookupFailed = false;
  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);

    if (dbUser.length > 0) {
      dbUserId = dbUser[0].id;
      const membership = await db
        .select({ role: churchMemberships.role })
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.userId, dbUser[0].id),
            eq(churchMemberships.churchId, churchId),
          ),
        )
        .limit(1);

      if (membership.length > 0) {
        role = coerceMemberRole(membership[0].role);
      }
    }
  } catch {
    lookupFailed = true;
  }

  if (lookupFailed || !dbUserId || !role) redirect("/churches");
  if (!hasMinRole(role, "ADMIN")) redirect(`/churches/${churchId}/services`);

  let patterns: {
    id: string;
    churchId: string;
    dayOfWeek: number;
    presetId: string;
    enabled: boolean;
  }[] = [];

  try {
    patterns = await db
      .select()
      .from(churchServicePatterns)
      .where(eq(churchServicePatterns.churchId, churchId));
  } catch {
    // DB not available — show empty state
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <h1 className="text-3xl font-heading font-semibold mb-2">
        Service Patterns
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure the default weekly service schedule. Use these patterns to
        auto-generate upcoming services.
      </p>
      <ServicePatternsClient churchId={churchId} initialPatterns={patterns} />
    </div>
  );
}
