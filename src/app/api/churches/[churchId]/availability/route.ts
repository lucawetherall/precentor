import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole, hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { availability, services, churchMemberships, availabilityStatusEnum } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const availabilityPostSchema = z.object({
  userId: z.string().optional(),
  serviceId: z.string().min(1, "serviceId is required"),
  status: z.enum(availabilityStatusEnum.enumValues, "Invalid status"),
});

const availabilityDeleteSchema = z.object({
  userId: z.string().optional(),
  serviceId: z.string().min(1, "serviceId is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, membership, error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, availabilityPostSchema);
  if (bodyError) return bodyError;
  const { userId, serviceId, status } = data;

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

    // Availability is "can this person sing on this date", keyed by
    // (userId, serviceId) — independent of role. We deliberately do NOT require
    // a matching role slot here: a newly-invited chorister has no voice part
    // assigned yet, and the headline promise is that they can submit their
    // availability. Role eligibility governs *rostering* (see the rota route),
    // not availability collection.

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
        status,
      })
      .onConflictDoUpdate({
        target: [availability.userId, availability.serviceId],
        set: { status },
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

  const { data, error: bodyError } = await parseJsonBody(request, availabilityDeleteSchema);
  if (bodyError) return bodyError;
  const { userId, serviceId } = data;

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
