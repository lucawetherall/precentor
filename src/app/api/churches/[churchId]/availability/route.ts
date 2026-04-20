import { NextResponse } from "next/server";
import { requireChurchRole, hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { availability, services, churchMemberships, availabilityStatusEnum, serviceRoleSlots, churchMemberRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiError, ErrorCodes } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, membership, error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { userId, serviceId, status } = body;

  if (!serviceId || !status) {
    return NextResponse.json({ error: "serviceId and status are required" }, { status: 400 });
  }

  const validStatuses = availabilityStatusEnum.enumValues;
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}` },
      { status: 400 }
    );
  }

  // Members can only set their own availability; editors+ can set for anyone
  const targetUserId = userId || user!.id;
  if (targetUserId !== user!.id && !hasMinRole(coerceMemberRole(membership!.role), "EDITOR")) {
    return NextResponse.json({ error: "You can only update your own availability" }, { status: 403 });
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

    // Enforce role eligibility — always required in Phase D
    const eligible = await db
      .select({ id: serviceRoleSlots.id })
      .from(serviceRoleSlots)
      .innerJoin(
        churchMemberRoles,
        and(
          eq(churchMemberRoles.catalogRoleId, serviceRoleSlots.catalogRoleId),
          eq(churchMemberRoles.userId, targetUserId),
          eq(churchMemberRoles.churchId, churchId),
        ),
      )
      .where(eq(serviceRoleSlots.serviceId, serviceId))
      .limit(1);
    if (eligible.length === 0) {
      return apiError("No eligible role for this service", 403, { code: ErrorCodes.NO_ELIGIBLE_ROLE });
    }

    // Verify target user is a member of this church
    if (targetUserId !== user!.id) {
      const targetMembership = await db
        .select()
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.userId, targetUserId),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .limit(1);

      if (targetMembership.length === 0) {
        return NextResponse.json({ error: "User is not a member of this church" }, { status: 400 });
      }
    }

    await db
      .insert(availability)
      .values({
        userId: targetUserId,
        serviceId,
        status: status as (typeof availabilityStatusEnum.enumValues)[number],
      })
      .onConflictDoUpdate({
        target: [availability.userId, availability.serviceId],
        set: { status: status as (typeof availabilityStatusEnum.enumValues)[number] },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to update availability", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, membership, error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  let body: { userId?: string; serviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, serviceId } = body;
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const targetUserId = userId || user!.id;
  if (targetUserId !== user!.id && !hasMinRole(coerceMemberRole(membership!.role), "EDITOR")) {
    return NextResponse.json({ error: "You can only update your own availability" }, { status: 403 });
  }

  // Verify service belongs to this church
  const service = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
    .limit(1);

  if (service.length === 0) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  try {
    await db
      .delete(availability)
      .where(and(eq(availability.userId, targetUserId), eq(availability.serviceId, serviceId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to delete availability", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
