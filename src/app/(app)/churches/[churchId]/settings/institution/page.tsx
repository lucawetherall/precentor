import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { roleCatalog, churchMemberRoles, churchMemberships, users } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { InstitutionClient } from "./institution-client";

export default async function InstitutionPage({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const institutionalRoles = await db.select().from(roleCatalog)
    .where(eq(roleCatalog.institutional, true))
    .orderBy(asc(roleCatalog.displayOrder));

  // Appointees: join churchMemberRoles → users, filtered to institutional roles
  const appointees = await db
    .select({
      assignmentId: churchMemberRoles.id,
      userId: churchMemberRoles.userId,
      catalogRoleId: churchMemberRoles.catalogRoleId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(churchMemberRoles)
    .innerJoin(users, eq(users.id, churchMemberRoles.userId))
    .innerJoin(roleCatalog, and(
      eq(roleCatalog.id, churchMemberRoles.catalogRoleId),
      eq(roleCatalog.institutional, true),
    ))
    .where(eq(churchMemberRoles.churchId, churchId));

  const members = await db
    .select({ id: churchMemberships.userId, name: users.name, email: users.email })
    .from(churchMemberships)
    .innerJoin(users, eq(users.id, churchMemberships.userId))
    .where(eq(churchMemberships.churchId, churchId))
    .orderBy(asc(users.name));

  return (
    <InstitutionClient
      churchId={churchId}
      institutionalRoles={institutionalRoles}
      appointees={appointees}
      members={members}
    />
  );
}
