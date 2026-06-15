import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireChurchRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { services } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureLiturgicalDay } from "@/lib/db/queries/liturgical-days";
import { writeCell } from "../_write-cell";
import { parseJsonBody } from "@/lib/api/parse-body";
import { cellBulkSchema } from "../schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req, cellBulkSchema);
  if (bodyError) return bodyError;
  // Zod can't express "either serviceId or ghost"; enforce inline so the
  // error stays as a 400 (matching the per-row validation message style).
  for (let i = 0; i < body.changes.length; i++) {
    const c = body.changes[i];
    if (!c.serviceId && !c.ghost) {
      return NextResponse.json({ error: `changes[${i}] requires serviceId or ghost` }, { status: 400 });
    }
  }

  const resolvedIds: Record<string, { id: string; serviceType: string }> = {};

  try {
    const result = await db.transaction(async (tx) => {
    // Pre-validate every explicit serviceId in one query — a stale or
    // foreign id is a client-visible 404, not a 500, and per-change SELECTs
    // would cost one round-trip per row.
    const explicitIds = Array.from(new Set(
      body.changes.filter((c) => c.serviceId).map((c) => c.serviceId!),
    ));
    const serviceTypesById = new Map<string, string>();
    if (explicitIds.length > 0) {
      const rows = await tx
        .select({ id: services.id, serviceType: services.serviceType })
        .from(services)
        .where(and(inArray(services.id, explicitIds), eq(services.churchId, churchId)));
      for (const row of rows) serviceTypesById.set(row.id, row.serviceType);
      if (serviceTypesById.size < explicitIds.length) {
        return { status: 404 as const };
      }
    }

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
              serviceType: change.ghost.serviceType,
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
                eq(services.serviceType, change.ghost.serviceType),
              ))
              .limit(1);
            if (!existing) throw new Error(`service for ghost ${change.ghost.date}:${change.ghost.serviceType} not found after conflict`);
            serviceId = existing.id;
            serviceType = existing.serviceType;
          }
          resolvedIds[key] = { id: serviceId!, serviceType };
        }
      } else if (serviceId) {
        // Validated by the inArray pre-check above.
        serviceType = serviceTypesById.get(serviceId)!;
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

    return {
      status: 200 as const,
      written: body.changes.length,
      resolvedGhosts: Object.keys(resolvedIds).length,
    };
    });

    if (result.status === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ written: result.written, resolvedGhosts: result.resolvedGhosts });
  } catch (err) {
    logger.error("Planning bulk write failed", err);
    return NextResponse.json({ error: "Failed to apply changes" }, { status: 500 });
  }
}
