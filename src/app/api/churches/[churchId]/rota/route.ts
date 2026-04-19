import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rotaEntries, services, churchMemberships, serviceRoleSlots, churchMemberRoles } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { useRoleSlotsModel } from "@/lib/feature-flags";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { userId, serviceId, confirmed } = body;

  if (!userId || !serviceId) {
    return NextResponse.json({ error: "userId and serviceId are required" }, { status: 400 });
  }

  if (useRoleSlotsModel()) {
    const { catalogRoleId } = body;
    if (!catalogRoleId) return apiError("catalogRoleId is required", 400, { code: ErrorCodes.INVALID_INPUT });

    const [memberRole] = await db.select().from(churchMemberRoles)
      .where(and(
        eq(churchMemberRoles.userId, userId),
        eq(churchMemberRoles.churchId, churchId),
        eq(churchMemberRoles.catalogRoleId, catalogRoleId),
      )).limit(1);
    if (!memberRole) return apiError("User does not hold this role", 403, { code: ErrorCodes.USER_LACKS_ROLE });

    const [slot] = await db.select().from(serviceRoleSlots)
      .where(and(eq(serviceRoleSlots.serviceId, serviceId), eq(serviceRoleSlots.catalogRoleId, catalogRoleId)))
      .limit(1);
    if (!slot) return apiError("Slot not on service", 404, { code: ErrorCodes.SLOT_NOT_ON_SERVICE });

    const existing = await db.select().from(rotaEntries)
      .where(and(
        eq(rotaEntries.serviceId, serviceId),
        eq(rotaEntries.catalogRoleId, catalogRoleId),
        isNull(rotaEntries.quarantinedAt),
      ));
    if (slot.exclusive && existing.length > 0) {
      return apiError("Slot already filled", 409, { code: ErrorCodes.SLOT_ALREADY_FILLED });
    }
    if (slot.maxCount != null && existing.length >= slot.maxCount) {
      return apiError("Slot at capacity", 409, { code: ErrorCodes.SLOT_AT_CAPACITY });
    }

    await db.insert(rotaEntries).values({ userId, serviceId, confirmed: true, catalogRoleId });

    const allSlots = await db.select().from(rotaEntries)
      .where(and(eq(rotaEntries.serviceId, serviceId), eq(rotaEntries.userId, userId), isNull(rotaEntries.quarantinedAt)));
    const warnings = allSlots.length > 1
      ? [{ code: "DUAL_ROLE", userId, serviceId, allHeldSlots: allSlots.map((e) => ({ catalogRoleId: e.catalogRoleId })) }]
      : [];
    return apiSuccess({ success: true, warnings }, 201);
  }

  try {
    // Verify service belongs to this church
    const service = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);

    if (service.length === 0) {
      return NextResponse.json({ error: "Service not found in this church" }, { status: 404 });
    }

    // Verify target user is a member of this church
    const membership = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, userId),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: "User is not a member of this church" }, { status: 400 });
    }

    if (confirmed) {
      // Legacy path: catalogRoleId may not be provided pre-Phase-D. Use body value or a sentinel sql expression.
      const catalogRoleId = body.catalogRoleId ?? sql`NULL::uuid`;
      await db
        .insert(rotaEntries)
        .values({ userId, serviceId, confirmed: true, catalogRoleId: catalogRoleId as any })
        .onConflictDoUpdate({
          target: [rotaEntries.serviceId, rotaEntries.userId],
          set: { confirmed: true },
        });
    } else {
      await db
        .delete(rotaEntries)
        .where(
          and(
            eq(rotaEntries.userId, userId),
            eq(rotaEntries.serviceId, serviceId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to update rota", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
