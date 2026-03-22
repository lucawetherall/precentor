import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchMemberships, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { InviteMemberForm } from "./invite-form";
import { hasMinRole } from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface MemberRow { id: string; role: string; voicePart: string | null; joinedAt: Date; userName: string | null; userEmail: string; }
  let members: MemberRow[] = [];
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

      if (membership.length > 0) {
        userRole = membership[0].role as MemberRole;
      }
    }

    members = await db
      .select({
        id: churchMemberships.id,
        role: churchMemberships.role,
        voicePart: churchMemberships.voicePart,
        joinedAt: churchMemberships.joinedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(churchMemberships)
      .innerJoin(users, eq(churchMemberships.userId, users.id))
      .where(eq(churchMemberships.churchId, churchId));
  } catch { /* DB not available */ }

  const isAdmin = hasMinRole(userRole, "ADMIN");

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Members</h1>

      {isAdmin && <InviteMemberForm churchId={churchId} />}

      <div className="mt-8 border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-foreground text-background">
              <th className="px-3 py-2 text-left font-body font-normal">Name</th>
              <th className="px-3 py-2 text-left font-body font-normal">Email</th>
              <th className="px-3 py-2 text-left font-body font-normal">Role</th>
              <th className="px-3 py-2 text-left font-body font-normal">Voice Part</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: MemberRow, i: number) => (
              <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-background"}>
                <td className="px-3 py-2">{m.userName || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{m.userEmail}</td>
                <td className="px-3 py-2 text-xs">{m.role}</td>
                <td className="px-3 py-2 text-xs">{m.voicePart || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
