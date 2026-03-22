import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rotaEntries, services, churchMemberships } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
      await db
        .insert(rotaEntries)
        .values({ userId, serviceId, confirmed: true })
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
