import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { serviceRoleSlots, rotaEntries } from "@/lib/db/schema";
import { presetSlotUpdateSchema } from "@/lib/validation/schemas";
import { and, eq, isNull } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> },
) {
  const { churchId, serviceId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [updated] = await db
    .update(serviceRoleSlots)
    .set(parsed.data)
    .where(and(eq(serviceRoleSlots.id, slotId), eq(serviceRoleSlots.serviceId, serviceId)))
    .returning();
  if (!updated) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> },
) {
  const { churchId, serviceId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  await db.transaction(async (tx) => {
    const [slot] = await tx.select({ catalogRoleId: serviceRoleSlots.catalogRoleId })
      .from(serviceRoleSlots)
      .where(and(eq(serviceRoleSlots.id, slotId), eq(serviceRoleSlots.serviceId, serviceId)))
      .limit(1);
    if (!slot) return;
    await tx.update(rotaEntries)
      .set({ quarantinedAt: new Date() })
      .where(and(
        eq(rotaEntries.serviceId, serviceId),
        eq(rotaEntries.catalogRoleId, slot.catalogRoleId!),
        isNull(rotaEntries.quarantinedAt),
      ));
    await tx.delete(serviceRoleSlots).where(eq(serviceRoleSlots.id, slotId));
  });

  return apiSuccess({ deleted: true });
}
