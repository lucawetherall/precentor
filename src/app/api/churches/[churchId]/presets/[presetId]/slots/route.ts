import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { presetRoleSlots, roleCatalog, churchServicePresets } from "@/lib/db/schema";
import { presetSlotCreateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function POST(
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
  const parsed = presetSlotCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [preset] = await db
    .select({ id: churchServicePresets.id })
    .from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!preset) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });

  const [role] = await db
    .select({ rotaEligible: roleCatalog.rotaEligible, category: roleCatalog.category })
    .from(roleCatalog)
    .where(eq(roleCatalog.id, parsed.data.catalogRoleId))
    .limit(1);
  if (!role) return apiError("Catalog role not found", 404, { code: ErrorCodes.NOT_FOUND });
  if (!role.rotaEligible) {
    return apiError("Role is not rota-eligible", 400, { code: ErrorCodes.ROLE_NOT_ROTA_ELIGIBLE });
  }
  if (role.category === "VOICE" && parsed.data.exclusive) {
    return apiError("Voice-part slots cannot be exclusive", 400, { code: ErrorCodes.VOICE_PART_CANNOT_BE_EXCLUSIVE });
  }

  try {
    const [created] = await db
      .insert(presetRoleSlots)
      .values({ ...parsed.data, presetId })
      .returning();
    return apiSuccess(created, 201);
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique")) {
      return apiError("Slot already exists for this role", 409, { code: ErrorCodes.CONFLICT });
    }
    throw e;
  }
}
