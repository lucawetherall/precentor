import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, getChurchMembership, hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { ChurchSidebar } from "@/components/church-sidebar";
import { MigrationBanner } from "@/components/migration-banner";

interface Props {
  children: React.ReactNode;
  params: Promise<{ churchId: string }>;
}

export default async function ChurchLayout({ children, params }: Props) {
  const { churchId } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const membership = await getChurchMembership(user.id, churchId);
  if (!membership) redirect("/churches");

  const churchRow = await db
    .select({ name: churches.name })
    .from(churches)
    .where(eq(churches.id, churchId))
    .limit(1);

  if (churchRow.length === 0) redirect("/churches");

  const userRole = coerceMemberRole(membership.role);
  const isAdmin = hasMinRole(userRole, "ADMIN");
  const canEdit = hasMinRole(userRole, "EDITOR");

  interface NavGroup {
    label?: string;
    items: { href: string; label: string; iconName: string; exactMatch?: boolean }[];
  }

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: `/churches/${churchId}`, label: "Overview", iconName: "Home", exactMatch: true },
        { href: `/churches/${churchId}/services`, label: "Services", iconName: "Calendar" },
        ...(canEdit ? [{ href: `/churches/${churchId}/planning`, label: "Planning", iconName: "LayoutGrid" }] : []),
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
        churchName={churchRow[0].name}
        userRole={membership.role}
        userEmail={user.email}
        navGroups={navGroups}
      />
      <main id="main-content" className="flex-1">
        {isAdmin && <MigrationBanner churchId={churchId} />}
        {children}
      </main>
    </div>
  );
}
