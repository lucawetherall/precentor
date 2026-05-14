import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChurchRole } from "@/lib/auth/permissions";
import { services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureLiturgicalDay } from "@/lib/db/queries/liturgical-days";
import { writeCell } from "../_write-cell";
import { parseJsonBody } from "@/lib/api/parse-body";
import { cellPatchSchema } from "../schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req, cellPatchSchema);
  if (bodyError) return bodyError;
  if (!body.serviceId && !body.ghost) {
    return NextResponse.json({ error: "Either serviceId or ghost is required" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    let serviceId = body.serviceId;
    let serviceType: string;

    if (!serviceId) {
      // body.ghost is non-null here — guarded above.
      const ghost = body.ghost!;
      const day = await ensureLiturgicalDay(tx, ghost.date);
      const inserted = await tx
        .insert(services)
        .values({
          churchId,
          liturgicalDayId: day.id,
          serviceType: ghost.serviceType,
          time: ghost.time ?? null,
        })
        .onConflictDoNothing({ target: [services.churchId, services.liturgicalDayId, services.serviceType] })
        .returning({ id: services.id, serviceType: services.serviceType });

      if (inserted.length > 0) {
        serviceId = inserted[0].id;
        serviceType = inserted[0].serviceType;
      } else {
        const [existing] = await tx
          .select({ id: services.id, serviceType: services.serviceType })
          .from(services)
          .where(and(
            eq(services.churchId, churchId),
            eq(services.liturgicalDayId, day.id),
            eq(services.serviceType, ghost.serviceType),
          ))
          .limit(1);
        if (!existing) return { status: 404 as const };
        serviceId = existing.id;
        serviceType = existing.serviceType;
      }
    } else {
      const [row] = await tx
        .select({ id: services.id, serviceType: services.serviceType, updatedAt: services.updatedAt })
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
        .limit(1);
      if (!row) return { status: 404 as const };
      if (body.expectedUpdatedAt && row.updatedAt.toISOString() !== body.expectedUpdatedAt) {
        return { status: 409 as const };
      }
      serviceType = row.serviceType;
    }

    await writeCell(tx, { serviceId: serviceId!, serviceType, column: body.column, value: body.value });

    const [updated] = await tx
      .update(services)
      .set({ updatedAt: new Date() })
      .where(eq(services.id, serviceId!))
      .returning({ id: services.id, updatedAt: services.updatedAt });

    return { status: 200 as const, serviceId: updated.id, updatedAt: updated.updatedAt };
  });

  if (result.status === 404) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (result.status === 409) return NextResponse.json({ error: "stale", conflict: true }, { status: 409 });
  return NextResponse.json({ serviceId: result.serviceId, updatedAt: result.updatedAt });
}
