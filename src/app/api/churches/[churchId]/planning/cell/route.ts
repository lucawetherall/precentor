import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChurchRole } from "@/lib/auth/permissions";
import { services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureLiturgicalDay } from "@/lib/db/queries/liturgical-days";
import { writeCell, type CellValue } from "../_write-cell";
import type { GridColumn } from "@/lib/planning/columns";

interface Body {
  serviceId?: string;
  ghost?: { date: string; serviceType: string; time?: string | null };
  column: GridColumn;
  value: CellValue;
  expectedUpdatedAt?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const body: Body = await req.json();

  const result = await db.transaction(async (tx) => {
    let serviceId = body.serviceId;
    let serviceType: string;

    if (!serviceId) {
      if (!body.ghost) throw new Error("Either serviceId or ghost is required");
      const day = await ensureLiturgicalDay(tx, body.ghost.date);
      const inserted = await tx
        .insert(services)
        .values({
          churchId,
          liturgicalDayId: day.id,
          serviceType: body.ghost.serviceType as typeof services.$inferInsert.serviceType,
          time: body.ghost.time ?? null,
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
            eq(services.serviceType, body.ghost.serviceType as typeof services.$inferInsert.serviceType),
          ))
          .limit(1);
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
