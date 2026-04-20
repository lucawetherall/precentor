import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roleCatalog, churchMemberRoles } from "@/lib/db/schema";
import { asc, eq, and, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const rows = await db
    .select({
      id: roleCatalog.id,
      key: roleCatalog.key,
      defaultName: roleCatalog.defaultName,
      category: roleCatalog.category,
      rotaEligible: roleCatalog.rotaEligible,
      institutional: roleCatalog.institutional,
      defaultExclusive: roleCatalog.defaultExclusive,
      defaultMinCount: roleCatalog.defaultMinCount,
      defaultMaxCount: roleCatalog.defaultMaxCount,
      displayOrder: roleCatalog.displayOrder,
      memberCount: sql<number>`count(${churchMemberRoles.id})::int`,
    })
    .from(roleCatalog)
    .leftJoin(
      churchMemberRoles,
      and(
        eq(churchMemberRoles.catalogRoleId, roleCatalog.id),
        eq(churchMemberRoles.churchId, churchId),
      ),
    )
    .groupBy(roleCatalog.id)
    .orderBy(asc(roleCatalog.displayOrder));

  return apiSuccess(rows);
}
