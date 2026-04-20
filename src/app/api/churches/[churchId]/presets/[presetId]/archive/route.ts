import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const [updated] = await db
    .update(churchServicePresets)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (!updated) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
