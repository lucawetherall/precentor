import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches, churchMemberships, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { ChurchSidebar } from "@/components/church-sidebar";

interface Props {
  children: React.ReactNode;
  params: Promise<{ churchId: string }>;
}

export default async function ChurchLayout({ children, params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let church: InferSelectModel<typeof churches> | null = null;
  let membership: InferSelectModel<typeof churchMemberships> | null = null;

  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length > 0) {
      const result = await db
        .select({
          church: churches,
          membership: churchMemberships,
        })
        .from(churchMemberships)
        .innerJoin(churches, eq(churchMemberships.churchId, churches.id))
        .where(
          and(
            eq(churchMemberships.userId, dbUser[0].id),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .limit(1);

      if (result.length > 0) {
        church = result[0].church;
        membership = result[0].membership;
      }
    }
  } catch (err) { console.error("Failed to load data:", err); }

  if (!church || !membership) {
    redirect("/churches");
  }

  const userRole = coerceMemberRole(membership.role);
  const isAdmin = hasMinRole(userRole, "ADMIN");

  interface NavGroup {
    label?: string;
    items: { href: string; label: string; iconName: string; exactMatch?: boolean }[];
  }

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: `/churches/${churchId}`, label: "Overview", iconName: "Home", exactMatch: true },
        { href: `/churches/${churchId}/services`, label: "Services", iconName: "Calendar" },
        { href: `/churches/${churchId}/rota`, label: "Rota", iconName: "Users" },
      ],
    },
    {
      label: "More",
      items: [
        { href: `/churches/${churchId}/repertoire`, label: "Repertoire", iconName: "Music" },
      ],
    },
    ...(isAdmin ? [{
      label: "Admin",
      items: [
        { href: `/churches/${churchId}/members`, label: "Members", iconName: "Users" },
        { href: `/churches/${churchId}/service-sheets`, label: "Service Sheets", iconName: "FileText" },
        { href: `/churches/${churchId}/music-list`, label: "Music List", iconName: "ScrollText" },
        { href: `/churches/${churchId}/settings`, label: "Settings", iconName: "Settings" },
      ],
    }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ChurchSidebar
        churchId={churchId}
        churchName={church.name}
        userRole={membership.role}
        userEmail={user.email || ""}
        navGroups={navGroups}
      />
      <main id="main-content" className="flex-1">{children}</main>
    </div>
  );
}
