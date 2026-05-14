import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog, migrationPhaseEnum, migrationSeverityEnum } from "@/lib/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

type MigrationPhase = (typeof migrationPhaseEnum.enumValues)[number];
type MigrationSeverity = (typeof migrationSeverityEnum.enumValues)[number];

function asEnum<T extends string>(values: readonly T[], v: string | null): T | undefined {
  return v && (values as readonly string[]).includes(v) ? (v as T) : undefined;
}

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const phase = asEnum<MigrationPhase>(migrationPhaseEnum.enumValues, url.searchParams.get("phase"));
  const churchId = url.searchParams.get("churchId");
  const severity = asEnum<MigrationSeverity>(migrationSeverityEnum.enumValues, url.searchParams.get("severity"));
  const code = url.searchParams.get("code");
  const includeDismissed = url.searchParams.get("includeDismissed") === "true";

  const clauses = [];
  if (phase) clauses.push(eq(migrationAuditLog.phase, phase));
  if (churchId) clauses.push(eq(migrationAuditLog.churchId, churchId));
  if (severity) clauses.push(eq(migrationAuditLog.severity, severity));
  if (code) clauses.push(eq(migrationAuditLog.code, code));
  if (!includeDismissed) clauses.push(isNull(migrationAuditLog.dismissedAt));

  const rows = await db.select().from(migrationAuditLog)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(migrationAuditLog.createdAt));

  return apiSuccess(rows);
}
