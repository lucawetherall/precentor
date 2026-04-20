import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const [updated] = await db.update(migrationAuditLog)
    .set({ dismissedAt: new Date() })
    .where(eq(migrationAuditLog.id, id))
    .returning();
  if (!updated) return apiError("Log entry not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
