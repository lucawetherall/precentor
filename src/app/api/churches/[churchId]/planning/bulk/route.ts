import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChurchRole } from "@/lib/auth/permissions";
import { services } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureLiturgicalDay } from "@/lib/db/queries/liturgical-days";
import { writeCell, type CellValue } from "../_write-cell";
import type { GridColumn } from "@/lib/planning/columns";

interface Change {
  serviceId?: string;
  ghost?: { date: string; serviceType: string; time?: string | null };
  column: GridColumn;
  value: CellValue;
}

interface Body { changes: Change[]; }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const body: Body = await req.json();
  if (!Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ error: "changes required" }, { status: 400 });
  }
  if (body.changes.length > 1000) {
    return NextResponse.json({ error: "too many changes (max 1000)" }, { status: 400 });
  }

  const resolvedIds: Record<string, { id: string; serviceType: string }> = {};

  const result = await db.transaction(async (tx) => {
    for (const change of body.changes) {
      let serviceId = change.serviceId;
      let serviceType: string;

      if (!serviceId && change.ghost) {
        const key = `${change.ghost.date}:${change.ghost.serviceType}`;
        if (resolvedIds[key]) {
          serviceId = resolvedIds[key].id;
          serviceType = resolvedIds[key].serviceType;
        } else {
          const day = await ensureLiturgicalDay(tx, change.ghost.date);
          const inserted = await tx
            .insert(services)
            .values({
              churchId,
              liturgicalDayId: day.id,
              serviceType: change.ghost.serviceType as typeof services.$inferInsert.serviceType,
              time: change.ghost.time ?? null,
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
                eq(services.serviceType, change.ghost.serviceType as typeof services.$inferInsert.serviceType),
              ))
              .limit(1);
            if (!existing) throw new Error(`service for ghost ${change.ghost.date}:${change.ghost.serviceType} not found after conflict`);
            serviceId = existing.id;
            serviceType = existing.serviceType;
          }
          resolvedIds[key] = { id: serviceId!, serviceType };
        }
      } else if (serviceId) {
        const [row] = await tx
          .select({ id: services.id, serviceType: services.serviceType })
          .from(services)
          .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
          .limit(1);
        if (!row) throw new Error(`service ${serviceId} not found`);
        serviceType = row.serviceType;
      } else {
        throw new Error("change requires either serviceId or ghost");
      }

      await writeCell(tx, { serviceId: serviceId!, serviceType, column: change.column, value: change.value });
    }

    // Bump updated_at on all touched services
    const touchedIds = Array.from(new Set([
      ...body.changes.filter((c) => c.serviceId).map((c) => c.serviceId!),
      ...Object.values(resolvedIds).map((r) => r.id),
    ]));
    if (touchedIds.length > 0) {
      await tx.update(services).set({ updatedAt: new Date() })
        .where(inArray(services.id, touchedIds));
    }

    return { written: body.changes.length, resolvedGhosts: Object.keys(resolvedIds).length };
  });

  return NextResponse.json(result);
}
