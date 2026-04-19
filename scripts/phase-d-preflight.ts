import "dotenv/config";
import { db } from "../src/lib/db";
import { migrationPhaseState, migrationAuditLog, rotaEntries, services } from "../src/lib/db/schema";
import { eq, isNull, and, not } from "drizzle-orm";

async function main() {
  let ok = true;

  // Check Phase B completed
  const [phaseB] = await db.select().from(migrationPhaseState).where(eq(migrationPhaseState.phase, "B")).limit(1);
  if (!phaseB) {
    console.error("❌ Phase B not yet marked complete in migration_phase_state");
    ok = false;
  } else {
    console.log("✅ Phase B completed at", phaseB.completedAt);
  }

  // Check no untriaged WARN/ERROR
  const unresolved = await db.select().from(migrationAuditLog)
    .where(and(isNull(migrationAuditLog.dismissedAt), not(eq(migrationAuditLog.severity, "INFO"))));
  if (unresolved.length > 0) {
    console.error(`❌ ${unresolved.length} unresolved WARN/ERROR migration log entries`);
    ok = false;
  } else {
    console.log("✅ No unresolved WARN/ERROR log entries");
  }

  // Check no rota entries with null catalogRoleId
  const nullRoleEntries = await db.select().from(rotaEntries).where(isNull(rotaEntries.catalogRoleId));
  if (nullRoleEntries.length > 0) {
    console.error(`❌ ${nullRoleEntries.length} rota_entries with catalogRoleId IS NULL`);
    ok = false;
  } else {
    console.log("✅ All rota_entries have catalogRoleId");
  }

  // Check every non-ARCHIVED service has presetId
  const servicesWithoutPreset = await db.select().from(services)
    .where(and(isNull(services.presetId), not(eq(services.status, "ARCHIVED"))));
  if (servicesWithoutPreset.length > 0) {
    console.error(`❌ ${servicesWithoutPreset.length} non-ARCHIVED services without presetId`);
    ok = false;
  } else {
    console.log("✅ All active services have presetId");
  }

  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
