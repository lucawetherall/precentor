import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, services } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sectionIds } = body as { sectionIds?: unknown };

  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    return NextResponse.json({ error: "sectionIds must be a non-empty array" }, { status: 400 });
  }

  if (!sectionIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "All sectionIds must be strings" }, { status: 400 });
  }

  const typedSectionIds = sectionIds as string[];

  try {
    // Verify the service belongs to this church
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Verify all provided IDs belong to this service
    const existing = await db
      .select({ id: serviceSections.id })
      .from(serviceSections)
      .where(and(eq(serviceSections.serviceId, serviceId), inArray(serviceSections.id, typedSectionIds)));

    if (existing.length !== typedSectionIds.length) {
      return NextResponse.json(
        { error: "One or more sectionIds do not belong to this service" },
        { status: 400 }
      );
    }

    // Update positionOrder in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < typedSectionIds.length; i++) {
        await tx
          .update(serviceSections)
          .set({ positionOrder: i + 1 })
          .where(and(eq(serviceSections.id, typedSectionIds[i]), eq(serviceSections.serviceId, serviceId)));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to reorder service sections", err);
    return NextResponse.json({ error: "Failed to reorder sections" }, { status: 500 });
  }
}
