import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchMemberRoles, churchMemberships } from "@/lib/db/schema";
import { memberRoleAssignmentSchema } from "@/lib/validation/schemas";
import { parseJsonBody } from "@/lib/api/parse-body";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string }> },
) {
  const { churchId, memberId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, memberRoleAssignmentSchema);
  if (bodyError) return bodyError;
  const { catalogRoleId, isPrimary } = data;

  const inserted = await db.transaction(async (tx) => {
    const membership = await tx
      .select({ userId: churchMemberships.userId })
      .from(churchMemberships)
      .where(and(eq(churchMemberships.userId, memberId), eq(churchMemberships.churchId, churchId)))
      .limit(1);
    if (membership.length === 0) return null;
    if (isPrimary) {
      await tx
        .update(churchMemberRoles)
        .set({ isPrimary: false })
        .where(and(eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)));
    }
    const rows = await tx
      .insert(churchMemberRoles)
      .values({ userId: memberId, churchId, catalogRoleId, isPrimary: !!isPrimary })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  });

  if (inserted === null) {
    return apiError("Member not in church or role already assigned", 404, { code: ErrorCodes.NOT_FOUND });
  }
  return apiSuccess(inserted, 201);
}
