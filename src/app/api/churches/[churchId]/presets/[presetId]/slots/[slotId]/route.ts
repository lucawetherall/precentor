import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { presetRoleSlots, churchServicePresets } from "@/lib/db/schema";
import { presetSlotUpdateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [slot] = await db
    .select({ id: presetRoleSlots.id })
    .from(presetRoleSlots)
    .innerJoin(churchServicePresets, eq(churchServicePresets.id, presetRoleSlots.presetId))
    .where(and(eq(presetRoleSlots.id, slotId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!slot) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });

  const [updated] = await db
    .update(presetRoleSlots)
    .set(parsed.data)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const deleted = await db
    .delete(presetRoleSlots)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  if (deleted.length === 0) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess({ deleted: true });
}
