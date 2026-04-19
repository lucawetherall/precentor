import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { rotaEntries, serviceRoleSlots, churchMemberRoles } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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
  const { userId, serviceId, catalogRoleId } = body;

  if (!userId || !serviceId) {
    return NextResponse.json({ error: "userId and serviceId are required" }, { status: 400 });
  }

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
