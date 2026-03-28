import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  churchMemberships,
  users,
  churchServicePatterns,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole } from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";
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

  // Verify ADMIN role
  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);

    if (dbUser.length === 0) redirect("/churches");

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

    if (membership.length === 0) redirect("/churches");

    const role = membership[0].role as MemberRole;
    if (!hasMinRole(role, "ADMIN")) redirect(`/churches/${churchId}/services`);
  } catch {
    redirect("/churches");
  }

  let patterns: {
    id: string;
    churchId: string;
    dayOfWeek: number;
    serviceType: string;
    time: string | null;
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
