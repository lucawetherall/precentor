import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { presetRoleSlots, churchServicePresets } from "@/lib/db/schema";
import { presetSlotUpdateSchema, validateSlotCounts } from "@/lib/validation/schemas";
import { parseJsonBody } from "@/lib/api/parse-body";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, presetSlotUpdateSchema);
  if (bodyError) return bodyError;

  const [slot] = await db
    .select({
      id: presetRoleSlots.id,
      minCount: presetRoleSlots.minCount,
      maxCount: presetRoleSlots.maxCount,
      exclusive: presetRoleSlots.exclusive,
    })
    .from(presetRoleSlots)
    .innerJoin(churchServicePresets, eq(churchServicePresets.id, presetRoleSlots.presetId))
    .where(and(eq(presetRoleSlots.id, slotId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!slot) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });

  // A PATCH may touch only some count fields, so validate the *merged* slot —
  // otherwise an update could persist a state the create schema forbids (e.g.
  // flipping exclusive on while maxCount stays at 5).
  const countError = validateSlotCounts({
    minCount: data.minCount ?? slot.minCount,
    maxCount: data.maxCount === undefined ? slot.maxCount : data.maxCount,
    exclusive: data.exclusive ?? slot.exclusive,
  });
  if (countError) return apiError(countError, 400, { code: ErrorCodes.INVALID_SLOT_CARDINALITY });

  const [updated] = await db
    .update(presetRoleSlots)
    .set(data)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  // The existence check above only scopes by slotId + church, so a valid slot
  // reached via the wrong presetId would match zero rows here and leave
  // `updated` undefined — return 404 rather than a misleading 200 + null body.
  if (!updated) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  // Verify the preset belongs to this church before deleting one of its
  // slots — otherwise an ADMIN of church A could delete a preset slot from
  // church B by guessing the (presetId, slotId) pair.
  const [owned] = await db
    .select({ id: churchServicePresets.id })
    .from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!owned) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });

  const deleted = await db
    .delete(presetRoleSlots)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  if (deleted.length === 0) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess({ deleted: true });
}
