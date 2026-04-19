import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchMemberRoles } from "@/lib/db/schema";
import { memberRoleUpdateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string; id: string }> },
) {
  const { churchId, memberId, id } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const deleted = await db
    .delete(churchMemberRoles)
    .where(
      and(
        eq(churchMemberRoles.id, id),
        eq(churchMemberRoles.userId, memberId),
        eq(churchMemberRoles.churchId, churchId),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    return apiError("Role assignment not found", 404, { code: ErrorCodes.NOT_FOUND });
  }
  return apiSuccess({ deleted: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string; id: string }> },
) {
  const { churchId, memberId, id } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = memberRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const updated = await db.transaction(async (tx) => {
    if (parsed.data.isPrimary === true) {
      await tx
        .update(churchMemberRoles)
        .set({ isPrimary: false })
        .where(and(eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)));
    }
    const rows = await tx
      .update(churchMemberRoles)
      .set(parsed.data)
      .where(and(eq(churchMemberRoles.id, id), eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)))
      .returning();
    return rows[0] ?? null;
  });

  if (!updated) return apiError("Role assignment not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
