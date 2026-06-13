import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  // The only consumer (the migration banner) needs severity counts, not the
  // full audit log — aggregate in SQL instead of shipping every row. The
  // settings page renders entries from its own direct DB query.
  const rows = await db
    .select({ severity: migrationAuditLog.severity, count: count() })
    .from(migrationAuditLog)
    .where(and(eq(migrationAuditLog.churchId, churchId), isNull(migrationAuditLog.dismissedAt)))
    .groupBy(migrationAuditLog.severity);

  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  for (const row of rows) {
    if (row.severity in counts) counts[row.severity as keyof typeof counts] = row.count;
  }

  return apiSuccess({ counts });
}
