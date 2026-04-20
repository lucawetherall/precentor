import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets, presetRoleSlots, churchServicePatterns, services } from "@/lib/db/schema";
import { presetUpdateSchema } from "@/lib/validation/schemas";
import { and, eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const [preset] = await db
    .select()
    .from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!preset) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });

  const slots = await db.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, presetId));
  return apiSuccess({ ...preset, slots });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [updated] = await db
    .update(churchServicePresets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (!updated) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const [patternRef] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(churchServicePatterns)
    .where(eq(churchServicePatterns.presetId, presetId));
  const [serviceRef] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(services)
    .where(eq(services.presetId, presetId));
  if ((patternRef?.count ?? 0) > 0 || (serviceRef?.count ?? 0) > 0) {
    return apiError("Preset is referenced; archive instead", 409, { code: ErrorCodes.CONFLICT });
  }

  const deleted = await db
    .delete(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (deleted.length === 0) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess({ deleted: true });
}
