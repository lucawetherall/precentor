import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchMemberships, users, churchMemberRoles, roleCatalog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { InviteMemberForm } from "./invite-form";
import { MembersTable } from "./members-table";
import { hasMinRole, coerceMemberRole, requireChurchRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { PageHeader } from "@/components/page-header";
import type { MemberRole } from "@/types";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { churchId } = await params;
  // Member management is ADMIN-only (matches the nav, which hides this link for
  // non-admins). Gating at MEMBER would let any member read the full roster —
  // including every member's email (PII) — via the direct URL.
  const { membership, error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const userRole: MemberRole = coerceMemberRole(membership!.role);

  interface MemberRow {
    id: string;
    role: string;
    joinedAt: Date;
    userName: string | null;
    userEmail: string;
    roles?: { id: string; catalogRoleId: string; name: string; isPrimary: boolean }[];
  }
  let members: MemberRow[] = [];

  try {
    const baseMembers = await db
      .select({
        id: churchMemberships.id,
        role: churchMemberships.role,
        joinedAt: churchMemberships.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userId: churchMemberships.userId,
      })
      .from(churchMemberships)
      .innerJoin(users, eq(churchMemberships.userId, users.id))
      .where(eq(churchMemberships.churchId, churchId));

    const memberRoles = await db
      .select({
        membershipId: churchMemberships.id,
        id: churchMemberRoles.id,
        catalogRoleId: churchMemberRoles.catalogRoleId,
        name: roleCatalog.defaultName,
        isPrimary: churchMemberRoles.isPrimary,
      })
      .from(churchMemberRoles)
      .innerJoin(roleCatalog, eq(roleCatalog.id, churchMemberRoles.catalogRoleId))
      .innerJoin(churchMemberships, and(
        eq(churchMemberships.userId, churchMemberRoles.userId),
        eq(churchMemberships.churchId, churchMemberRoles.churchId),
      ))
      .where(eq(churchMemberRoles.churchId, churchId));

    const rolesByMembershipId = memberRoles.reduce<Record<string, typeof memberRoles>>((acc, r) => {
      (acc[r.membershipId] ??= []).push(r);
      return acc;
    }, {});

    members = baseMembers.map(({ userId: _userId, ...m }) => ({
      ...m,
      roles: (rolesByMembershipId[m.id] ?? []).map((r) => ({
        id: r.id,
        catalogRoleId: r.catalogRoleId,
        name: r.name,
        isPrimary: r.isPrimary,
      })),
    }));
  } catch (err) { logger.error("[members/page] Failed to load members", err); }

  const isAdmin = hasMinRole(userRole, "ADMIN");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <PageHeader
        eyebrow="Parish"
        title="Members"
        subtitle="Singers, organists, clergy, and others in your community"
      />

      {isAdmin && <InviteMemberForm churchId={churchId} />}

      <MembersTable
        initialMembers={members}
        churchId={churchId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
