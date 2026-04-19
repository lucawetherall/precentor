import "dotenv/config";
import { db } from "../src/lib/db";
import {
  churches,
  churchMemberships,
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
import { eq, and, isNotNull, isNull } from "drizzle-orm";
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
  const memberships = await tx
    .select()
    .from(churchMemberships)
    .where(isNotNull(churchMemberships.voicePart));
  for (const m of memberships) {
    const role = catalogByKey.get(m.voicePart!);
    if (!role) continue;
    await tx
      .insert(churchMemberRoles)
      .values({
        userId: m.userId,
        churchId: m.churchId,
        catalogRoleId: role.id,
        isPrimary: true,
        displayOrder: 0,
      })
      .onConflictDoNothing();
  }
  const withoutVoice = await tx
    .select()
    .from(churchMemberships)
    .where(isNull(churchMemberships.voicePart));
  for (const m of withoutVoice) {
    await tx.insert(migrationAuditLog).values({
      phase: "B",
      churchId: m.churchId,
      severity: "INFO",
      code: "MEMBER_NO_VOICE_PART",
      details: { userId: m.userId },
    });
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
  const patterns = await tx.select().from(churchServicePatterns);
  const timesByPreset = new Map<string, Array<string | null>>();

  for (const p of patterns) {
    const pKeys = presetsByChurch.get(p.churchId);
    if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(
      p.serviceType as ServiceTypeKey,
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
  const all = await tx.select().from(services);
  for (const s of all) {
    const pKeys = presetsByChurch.get(s.churchId);
    if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(
      s.serviceType as ServiceTypeKey,
      s.choirStatus as ChoirStatusKey,
    );
    await tx.update(services).set({ presetId: pKeys[targetKey] }).where(eq(services.id, s.id));
  }
}

async function step6_snapshotServiceSlots(tx: Tx) {
  const all = await tx
    .select({ id: services.id, presetId: services.presetId, choirStatus: services.choirStatus })
    .from(services)
    .where(isNotNull(services.presetId));
  for (const s of all) {
    if (s.choirStatus === "SAID_SERVICE_ONLY" || s.choirStatus === "NO_SERVICE") continue;
    const slots = await tx
      .select()
      .from(presetRoleSlots)
      .where(eq(presetRoleSlots.presetId, s.presetId!));
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
  const rows = await tx
    .select({
      entryId: rotaEntries.id,
      userId: rotaEntries.userId,
      serviceId: rotaEntries.serviceId,
      churchId: services.churchId,
      voicePart: churchMemberships.voicePart,
    })
    .from(rotaEntries)
    .innerJoin(services, eq(services.id, rotaEntries.serviceId))
    .leftJoin(
      churchMemberships,
      and(
        eq(churchMemberships.userId, rotaEntries.userId),
        eq(churchMemberships.churchId, services.churchId),
      ),
    )
    .where(isNull(rotaEntries.catalogRoleId));

  for (const r of rows) {
    if (!r.voicePart) continue;
    const role = catalogByKey.get(r.voicePart);
    if (!role) continue;
    await tx.update(rotaEntries).set({ catalogRoleId: role.id }).where(eq(rotaEntries.id, r.entryId));
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
  await tx.update(services).set({ status: "ARCHIVED" }).where(eq(services.choirStatus, "NO_SERVICE"));
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
