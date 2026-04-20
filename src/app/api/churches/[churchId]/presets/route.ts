import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { presetCreateSchema } from "@/lib/validation/schemas";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const whereClause = includeArchived
    ? eq(churchServicePresets.churchId, churchId)
    : and(eq(churchServicePresets.churchId, churchId), isNull(churchServicePresets.archivedAt));
  const rows = await db.select().from(churchServicePresets).where(whereClause);
  return apiSuccess(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  try {
    const [created] = await db
      .insert(churchServicePresets)
      .values({ ...parsed.data, churchId })
      .returning();
    return apiSuccess(created, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique")) {
      return apiError("Preset name already exists in this church", 409, { code: ErrorCodes.CONFLICT });
    }
    throw e;
  }
}
