import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { serviceRoleSlots, services, presetRoleSlots } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> },
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const [svc] = await db.select().from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });
  if (!svc.presetId) return apiError("Service has no preset to restore from", 409, { code: ErrorCodes.CONFLICT });

  await db.transaction(async (tx) => {
    await tx.delete(serviceRoleSlots).where(eq(serviceRoleSlots.serviceId, serviceId));
    const slots = await tx.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, svc.presetId!));
    if (slots.length > 0) {
      await tx.insert(serviceRoleSlots).values(slots.map((s) => ({
        serviceId,
        catalogRoleId: s.catalogRoleId,
        minCount: s.minCount,
        maxCount: s.maxCount,
        exclusive: s.exclusive,
        displayOrder: s.displayOrder,
      })));
    }
  });

  return apiSuccess({ restored: true });
}
