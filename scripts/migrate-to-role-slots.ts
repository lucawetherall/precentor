import "dotenv/config";
import { db } from "../src/lib/db";
import {
  churches,
  services,
  rotaEntries,
  churchServicePatterns,
  roleCatalog,
  churchMemberRoles,
  churchServicePresets,
  presetRoleSlots,
  serviceRoleSlots,
  migrationPhaseState,
  migrationAuditLog,
  quarantinedRotaEntries,
} from "../src/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  mapServiceTypeAndChoirStatusToPresetKey,
  resolveDefaultTime,
  type ServiceTypeKey,
  type ChoirStatusKey,
} from "../src/lib/migration/preset-mapping";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function runPhaseB(dbInstance = db) {
  console.log("[Phase B] starting");
  const [existing] = await dbInstance
    .select()
    .from(migrationPhaseState)
    .where(eq(migrationPhaseState.phase, "B"))
    .limit(1);
  if (existing) {
    console.log("[Phase B] already completed at", existing.completedAt);
    return;
  }

  await dbInstance.transaction(async (tx) => {
    const catalog = await tx.select().from(roleCatalog);
    const catalogByKey = new Map(catalog.map((r) => [r.key, r]));

    await step1_backfillMemberRoles(tx, catalogByKey);
    const presetsByChurch = await step2_generatePresets(tx);
    await step3_populateDefaultSlots(tx, presetsByChurch, catalogByKey);
    await step4_mapPatterns(tx, presetsByChurch);
    await step5_mapServices(tx, presetsByChurch);
    await step6_snapshotServiceSlots(tx);
    await step7_backfillRotaEntries(tx, catalogByKey);
    await step8_archiveNoService(tx);
    await step9_quarantineOrphans(tx);

    await tx.insert(migrationPhaseState).values({ phase: "B" });
  });

  console.log("[Phase B] complete");
}

async function step1_backfillMemberRoles(tx: Tx, catalogByKey: Map<string, { id: string; key: string }>) {
  // voice_part was dropped in Phase D schema; access via raw SQL for this pre-Phase-D migration
  const memberships = await tx.execute<{ id: string; user_id: string; church_id: string; voice_part: string | null }>(
    sql`SELECT id, user_id, church_id, voice_part FROM church_memberships`,
  );
  for (const m of memberships) {
    if (!m.voice_part) {
      await tx.insert(migrationAuditLog).values({
        phase: "B",
        churchId: m.church_id,
        severity: "INFO",
        code: "MEMBER_NO_VOICE_PART",
        details: { userId: m.user_id },
      });
      continue;
    }
    const role = catalogByKey.get(m.voice_part);
    if (!role) continue;
    await tx
      .insert(churchMemberRoles)
      .values({
        userId: m.user_id,
        churchId: m.church_id,
        catalogRoleId: role.id,
        isPrimary: true,
        displayOrder: 0,
      })
      .onConflictDoNothing();
  }
}

type PresetMap = { DEFAULT_CHORAL: string; ORGANIST_ONLY_EUCHARIST: string; SAID_EUCHARIST: string };

async function step2_generatePresets(tx: Tx): Promise<Map<string, PresetMap>> {
  const allChurches = await tx.select({ id: churches.id }).from(churches);
  const presetsByChurch = new Map<string, PresetMap>();

  const PRESETS = [
    { key: "DEFAULT_CHORAL" as const, name: "Default Choral", serviceType: "SUNG_EUCHARIST" as const, choirRequirement: "FULL_CHOIR" as const, musicListFieldSet: "CHORAL" as const },
    { key: "ORGANIST_ONLY_EUCHARIST" as const, name: "Organist-only Eucharist", serviceType: "SAID_EUCHARIST" as const, choirRequirement: "ORGANIST_ONLY" as const, musicListFieldSet: "HYMNS_ONLY" as const },
    { key: "SAID_EUCHARIST" as const, name: "Said Eucharist", serviceType: "SAID_EUCHARIST" as const, choirRequirement: "SAID" as const, musicListFieldSet: "READINGS_ONLY" as const },
  ] as const;

  for (const c of allChurches) {
    const created: Partial<PresetMap> = {};
    for (const p of PRESETS) {
      const [existing] = await tx
        .select({ id: churchServicePresets.id })
        .from(churchServicePresets)
        .where(
          and(
            eq(churchServicePresets.churchId, c.id),
            eq(churchServicePresets.name, p.name),
            isNull(churchServicePresets.archivedAt),
          ),
        )
        .limit(1);
      if (existing) {
        created[p.key] = existing.id;
        continue;
      }
      const [row] = await tx
        .insert(churchServicePresets)
        .values({
          churchId: c.id,
          name: p.name,
          serviceType: p.serviceType,
          choirRequirement: p.choirRequirement,
          musicListFieldSet: p.musicListFieldSet,
          defaultTime: null,
          liturgicalSeasonTags: [],
        })
        .returning({ id: churchServicePresets.id });
      created[p.key] = row.id;
    }
    presetsByChurch.set(c.id, created as PresetMap);
  }
  return presetsByChurch;
}

async function step3_populateDefaultSlots(
  tx: Tx,
  presetsByChurch: Map<string, PresetMap>,
  catalogByKey: Map<string, { id: string; key: string }>,
) {
  const voiceParts = ["SOPRANO", "ALTO", "TENOR", "BASS"].map((k) => catalogByKey.get(k)!).filter(Boolean);
  const org = catalogByKey.get("ORGANIST");
  const dir = catalogByKey.get("DIRECTOR");

  for (const [, pKeys] of presetsByChurch) {
    const choralId = pKeys.DEFAULT_CHORAL;
    const organistOnlyId = pKeys.ORGANIST_ONLY_EUCHARIST;

    const choralRows = [
      ...voiceParts.map((v, i) => ({
        presetId: choralId,
        catalogRoleId: v.id,
        minCount: 1,
        maxCount: null as number | null,
        exclusive: false,
        displayOrder: (i + 1) * 10,
      })),
      ...(org ? [{ presetId: choralId, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 50 }] : []),
      ...(dir ? [{ presetId: choralId, catalogRoleId: dir.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 60 }] : []),
    ];
    for (const r of choralRows) {
      await tx.insert(presetRoleSlots).values(r).onConflictDoNothing();
    }
    if (org) {
      await tx
        .insert(presetRoleSlots)
        .values({ presetId: organistOnlyId, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10 })
        .onConflictDoNothing();
    }
  }
}

async function step4_mapPatterns(tx: Tx, presetsByChurch: Map<string, PresetMap>) {
  // service_type and time were dropped from church_service_patterns in Phase D; use raw SQL
  const patterns = await tx.execute<{ id: string; church_id: string; service_type: string; time: string | null }>(
    sql`SELECT id, church_id, service_type, "time" FROM church_service_patterns`,
  );
  const timesByPreset = new Map<string, Array<string | null>>();

  for (const p of patterns) {
    const pKeys = presetsByChurch.get(p.church_id);
    if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(
      p.service_type as ServiceTypeKey,
      "CHOIR_REQUIRED",
    );
    const presetId = pKeys[targetKey];
    await tx.update(churchServicePatterns).set({ presetId }).where(eq(churchServicePatterns.id, p.id));
    const bucket = timesByPreset.get(presetId) ?? [];
    bucket.push(p.time ?? null);
    timesByPreset.set(presetId, bucket);
  }

  for (const [presetId, times] of timesByPreset) {
    const { time, ambiguous } = resolveDefaultTime(times);
    await tx.update(churchServicePresets).set({ defaultTime: time }).where(eq(churchServicePresets.id, presetId));
    if (ambiguous) {
      const [preset] = await tx
        .select({ churchId: churchServicePresets.churchId })
        .from(churchServicePresets)
        .where(eq(churchServicePresets.id, presetId))
        .limit(1);
      if (preset) {
        await tx.insert(migrationAuditLog).values({
          phase: "B",
          churchId: preset.churchId,
          severity: "WARN",
          code: "PRESET_TIME_AMBIGUOUS",
          details: { presetId, observedTimes: Array.from(new Set(times)) },
        });
      }
    }
  }
}

async function step5_mapServices(tx: Tx, presetsByChurch: Map<string, PresetMap>) {
  // choir_status was dropped in Phase D schema; access via raw SQL for this pre-Phase-D migration
  const allRaw = await tx.execute<{ id: string; church_id: string; service_type: string; choir_status: string }>(
    sql`SELECT id, church_id, service_type, choir_status FROM services`,
  );
  for (const s of allRaw) {
    const pKeys = presetsByChurch.get(s.church_id);
    if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(
      s.service_type as ServiceTypeKey,
      s.choir_status as ChoirStatusKey,
    );
    await tx.update(services).set({ presetId: pKeys[targetKey] }).where(eq(services.id, s.id));
  }
}

async function step6_snapshotServiceSlots(tx: Tx) {
  // choir_status was dropped in Phase D schema; access via raw SQL for this pre-Phase-D migration
  const all = await tx.execute<{ id: string; preset_id: string | null; choir_status: string | null }>(
    sql`SELECT id, preset_id, choir_status FROM services WHERE preset_id IS NOT NULL`,
  );
  for (const s of all) {
    if (s.choir_status === "SAID_SERVICE_ONLY" || s.choir_status === "NO_SERVICE") continue;
    const slots = await tx
      .select()
      .from(presetRoleSlots)
      .where(eq(presetRoleSlots.presetId, s.preset_id!));
    for (const sl of slots) {
      await tx
        .insert(serviceRoleSlots)
        .values({
          serviceId: s.id,
          catalogRoleId: sl.catalogRoleId,
          minCount: sl.minCount,
          maxCount: sl.maxCount,
          exclusive: sl.exclusive,
          displayOrder: sl.displayOrder,
        })
        .onConflictDoNothing();
    }
  }
}

async function step7_backfillRotaEntries(tx: Tx, catalogByKey: Map<string, { id: string; key: string }>) {
  // voice_part was dropped in Phase D schema; use raw SQL join for this pre-Phase-D migration
  const rows = await tx.execute<{
    entry_id: string; user_id: string; service_id: string; church_id: string; voice_part: string | null;
  }>(sql`
    SELECT re.id AS entry_id, re.user_id, re.service_id, s.church_id,
           cm.voice_part
    FROM rota_entries re
    INNER JOIN services s ON s.id = re.service_id
    LEFT JOIN church_memberships cm ON cm.user_id = re.user_id AND cm.church_id = s.church_id
    WHERE re.catalog_role_id IS NULL
  `);

  for (const r of rows) {
    if (!r.voice_part) continue;
    const role = catalogByKey.get(r.voice_part);
    if (!role) continue;
    await tx.update(rotaEntries).set({ catalogRoleId: role.id }).where(eq(rotaEntries.id, r.entry_id));
  }

  const remaining = await tx.select().from(rotaEntries).where(isNull(rotaEntries.catalogRoleId));
  for (const r of remaining) {
    const [svc] = await tx
      .select({ churchId: services.churchId })
      .from(services)
      .where(eq(services.id, r.serviceId))
      .limit(1);
    await tx.insert(migrationAuditLog).values({
      phase: "B",
      churchId: svc?.churchId ?? null,
      severity: "WARN",
      code: "ROTA_ENTRY_UNCLASSIFIED",
      details: { rotaEntryId: r.id, userId: r.userId, serviceId: r.serviceId },
    });
  }
}

async function step8_archiveNoService(tx: Tx) {
  // choir_status was dropped in Phase D schema; use raw SQL for this pre-Phase-D migration
  await tx.execute(sql`UPDATE services SET status = 'ARCHIVED' WHERE choir_status = 'NO_SERVICE'`);
}

async function step9_quarantineOrphans(tx: Tx) {
  const orphans = await tx.select().from(rotaEntries).where(isNull(rotaEntries.catalogRoleId));
  for (const o of orphans) {
    await tx.insert(quarantinedRotaEntries).values({
      originalEntryId: o.id,
      serviceId: o.serviceId,
      userId: o.userId,
      confirmed: o.confirmed,
      quarantineReason: "ROTA_ENTRY_UNCLASSIFIED",
    });
    await tx.delete(rotaEntries).where(eq(rotaEntries.id, o.id));
  }
}

// Script entry point (only runs when called directly, not when imported by tests)
if (require.main === module) {
  runPhaseB().catch((e) => {
    console.error("[Phase B] FAILED", e);
    process.exit(1);
  });
}
