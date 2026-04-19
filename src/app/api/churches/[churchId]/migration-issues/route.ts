import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const entries = await db
    .select()
    .from(migrationAuditLog)
    .where(and(eq(migrationAuditLog.churchId, churchId), isNull(migrationAuditLog.dismissedAt)));

  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  for (const e of entries) counts[e.severity as keyof typeof counts]++;

  return apiSuccess({ counts, entries });
}
