import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  churches,
  users,
  churchMemberships,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { hasMinRole } from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";
import { MusicListFormClient } from "./music-list-form-client";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function MusicListPage({ params }: Props) {
  const { churchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let userRole: MemberRole = "MEMBER";
  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);
    if (dbUser.length > 0) {
      const membership = await db
        .select()
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.userId, dbUser[0].id),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .limit(1);
      if (membership.length > 0) userRole = membership[0].role as MemberRole;
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  }

  if (!hasMinRole(userRole, "ADMIN")) {
    redirect(`/churches/${churchId}`);
  }

  let churchName = "";
  try {
    const churchRows = await db
      .select({ name: churches.name })
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);
    if (churchRows.length > 0) churchName = churchRows[0].name;
  } catch (err) {
    console.error("Failed to load church:", err);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Music List</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Generate a printable music list announcing choral and organ music for a
        date range. The PDF includes every service with music planned in the
        period you select.
      </p>

      <MusicListFormClient churchId={churchId} churchName={churchName} />
    </div>
  );
}
