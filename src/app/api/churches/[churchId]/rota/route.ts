import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { rotaEntries, serviceRoleSlots, churchMemberRoles, services } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parse-body";

const rotaCreateSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  serviceId: z.string().min(1, "serviceId is required"),
  catalogRoleId: z.string().min(1, "catalogRoleId is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, rotaCreateSchema);
  if (bodyError) return bodyError;
  const { userId, serviceId, catalogRoleId } = data;

  // Verify the service belongs to this church before doing anything else.
  // Without this, an EDITOR of church A could insert rota entries against a
  // service in church B, polluting another church's rota.
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });

  const [memberRole] = await db.select().from(churchMemberRoles)
    .where(and(
      eq(churchMemberRoles.userId, userId),
      eq(churchMemberRoles.churchId, churchId),
      eq(churchMemberRoles.catalogRoleId, catalogRoleId),
    )).limit(1);
  if (!memberRole) return apiError("User does not hold this role", 403, { code: ErrorCodes.USER_LACKS_ROLE });

  // Lock the slot row, re-read its current occupancy, enforce capacity, and
  // insert — all in one transaction. Without the row lock, two concurrent
  // requests could both read `existing` before either inserts and both pass the
  // exclusive/maxCount guard, overfilling the slot. Locking serviceRoleSlots
  // serialises inserts for this slot even when it starts empty (a plain
  // SELECT ... FOR UPDATE on rotaEntries would lock nothing in that case).
  const result = await db.transaction(async (tx) => {
    const [slot] = await tx.select().from(serviceRoleSlots)
      .where(and(eq(serviceRoleSlots.serviceId, serviceId), eq(serviceRoleSlots.catalogRoleId, catalogRoleId)))
      .limit(1)
      .for("update");
    if (!slot) return { notOnService: true as const };

    const existing = await tx.select().from(rotaEntries)
      .where(and(
        eq(rotaEntries.serviceId, serviceId),
        eq(rotaEntries.catalogRoleId, catalogRoleId),
        isNull(rotaEntries.quarantinedAt),
      ));
    if (slot.exclusive && existing.length > 0) {
      return { filled: true as const };
    }
    if (slot.maxCount != null && existing.length >= slot.maxCount) {
      return { atCapacity: true as const };
    }

    await tx.insert(rotaEntries).values({ userId, serviceId, confirmed: true, catalogRoleId });

    const allSlots = await tx.select().from(rotaEntries)
      .where(and(eq(rotaEntries.serviceId, serviceId), eq(rotaEntries.userId, userId), isNull(rotaEntries.quarantinedAt)));
    const warnings = allSlots.length > 1
      ? [{ code: "DUAL_ROLE", userId, serviceId, allHeldSlots: allSlots.map((e) => ({ catalogRoleId: e.catalogRoleId })) }]
      : [];
    return { warnings };
  });

  if ("notOnService" in result) return apiError("Slot not on service", 404, { code: ErrorCodes.SLOT_NOT_ON_SERVICE });
  if ("filled" in result) return apiError("Slot already filled", 409, { code: ErrorCodes.SLOT_ALREADY_FILLED });
  if ("atCapacity" in result) return apiError("Slot at capacity", 409, { code: ErrorCodes.SLOT_AT_CAPACITY });
  return apiSuccess({ success: true, warnings: result.warnings }, 201);
}

const rotaDeleteSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  serviceId: z.string().min(1, "serviceId is required"),
  catalogRoleId: z.string().min(1, "catalogRoleId is required"),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, rotaDeleteSchema);
  if (bodyError) return bodyError;
  const { userId, serviceId, catalogRoleId } = data;

  // Verify the service belongs to this church before deleting, so an editor of
  // church A cannot clear church B's rota by guessing a serviceId.
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });

  // Remove the live assignment. Quarantined rows are migration bookkeeping and
  // are left untouched. Idempotent: deleting an already-empty assignment is fine.
  await db.delete(rotaEntries).where(and(
    eq(rotaEntries.serviceId, serviceId),
    eq(rotaEntries.userId, userId),
    eq(rotaEntries.catalogRoleId, catalogRoleId),
    isNull(rotaEntries.quarantinedAt),
  ));

  return apiSuccess({ success: true });
}
