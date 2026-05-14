import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, services } from "@/lib/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const sectionReorderSchema = z.object({
  sectionIds: z
    .array(z.string("All sectionIds must be strings"))
    .min(1, "sectionIds must be a non-empty array"),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, sectionReorderSchema);
  if (bodyError) return bodyError;
  const { sectionIds } = data;

  try {
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
      .where(and(eq(serviceSections.serviceId, serviceId), inArray(serviceSections.id, sectionIds)));

    if (existing.length !== sectionIds.length) {
      return NextResponse.json(
        { error: "One or more sectionIds do not belong to this service" },
        { status: 400 }
      );
    }

    // Verify the provided list is complete (includes all sections for this service)
    const [totalResult] = await db
      .select({ total: count() })
      .from(serviceSections)
      .where(eq(serviceSections.serviceId, serviceId));
    if ((totalResult?.total ?? 0) !== sectionIds.length) {
      return NextResponse.json(
        { error: "sectionIds must include all sections for this service" },
        { status: 400 }
      );
    }

    // Update positionOrder in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < sectionIds.length; i++) {
        await tx
          .update(serviceSections)
          .set({ positionOrder: i + 1 })
          .where(and(eq(serviceSections.id, sectionIds[i]), eq(serviceSections.serviceId, serviceId)));
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to reorder service sections", err);
    return NextResponse.json({ error: "Failed to reorder sections" }, { status: 500 });
  }
}
