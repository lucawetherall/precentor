import { db } from "@/lib/db";
import {
  roleCatalog,
  churchServicePresets,
  presetRoleSlots,
  churchServicePatterns,
  serviceTypeEnum,
} from "@/lib/db/schema";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A service the admin ticked on the "Add Church" form. */
export interface ServiceSelection {
  type: (typeof serviceTypeEnum.enumValues)[number];
  time?: string | null;
}

// The three presets every church starts with (mirrors the Phase D migration so
// new churches match migrated ones). Default Choral is the Sunday default.
const DEFAULT_PRESETS = [
  { key: "DEFAULT_CHORAL", name: "Default Choral", serviceType: "SUNG_EUCHARIST", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL", defaultTime: "10:00" },
  { key: "ORGANIST_ONLY_EUCHARIST", name: "Organist-only Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "ORGANIST_ONLY", musicListFieldSet: "HYMNS_ONLY", defaultTime: null },
  { key: "SAID_EUCHARIST", name: "Said Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "SAID", musicListFieldSet: "READINGS_ONLY", defaultTime: null },
] as const;

// Service types that imply a full choir (and therefore the SATB + organist +
// director role slots) when the admin selects them at church creation.
const CHORAL_SERVICE_TYPES = new Set<string>([
  "SUNG_EUCHARIST",
  "CHORAL_EVENSONG",
  "CHORAL_MATINS",
  "COMPLINE",
]);

/**
 * Seed a newly-created church with the default presets, role slots for the
 * choral presets, and weekly Sunday patterns. Must run inside the
 * church-creation transaction. Returns the Default Choral preset id.
 *
 * With no `selections`, the church gets a single Sunday pattern pointing at
 * Default Choral (the onboarding default). When the admin ticked specific
 * services on the "Add Church" form, each selection gets a preset (reusing a
 * standard one where the service type matches) and its own Sunday pattern, so
 * generated services carry sections, music slots, and role slots exactly like
 * onboarding-created ones.
 *
 * Call `generateServicesForChurch` AFTER the transaction commits to fan the
 * Sunday patterns out into actual services.
 */
export async function createDefaultChurchSetup(
  tx: Tx,
  churchId: string,
  selections?: ServiceSelection[],
): Promise<{ choralPresetId: string }> {
  const catalog = await tx.select().from(roleCatalog);
  const byKey = new Map(catalog.map((r) => [r.key, r]));

  const presetIds: Record<string, string> = {};
  for (const p of DEFAULT_PRESETS) {
    // When the admin picked a time for the matching service type, store it as
    // the preset's default so generated services inherit it.
    const selected = selections?.find((s) => s.type === p.serviceType);
    const [row] = await tx
      .insert(churchServicePresets)
      .values({
        churchId,
        name: p.name,
        serviceType: p.serviceType,
        choirRequirement: p.choirRequirement,
        musicListFieldSet: p.musicListFieldSet,
        defaultTime: selected?.time ?? p.defaultTime,
        liturgicalSeasonTags: [],
      })
      .returning({ id: churchServicePresets.id });
    presetIds[p.key] = row.id;
  }

  const choralId = presetIds.DEFAULT_CHORAL;

  // Role-slot block shared by every full-choir preset: SATB (non-exclusive),
  // organist + director (exclusive).
  const voiceParts = ["SOPRANO", "ALTO", "TENOR", "BASS"].map((k) => byKey.get(k)).filter(Boolean) as { id: string }[];
  const org = byKey.get("ORGANIST");
  const dir = byKey.get("DIRECTOR");
  const choralSlotsFor = (presetId: string) => [
    ...voiceParts.map((v, i) => ({ presetId, catalogRoleId: v.id, minCount: 1, maxCount: null as number | null, exclusive: false, displayOrder: (i + 1) * 10 })),
    ...(org ? [{ presetId, catalogRoleId: org.id, minCount: 1, maxCount: 1 as number | null, exclusive: true, displayOrder: 50 }] : []),
    ...(dir ? [{ presetId, catalogRoleId: dir.id, minCount: 1, maxCount: 1 as number | null, exclusive: true, displayOrder: 60 }] : []),
  ];

  const choralSlots = choralSlotsFor(choralId);
  if (choralSlots.length > 0) await tx.insert(presetRoleSlots).values(choralSlots);
  if (org) {
    await tx.insert(presetRoleSlots).values({ presetId: presetIds.ORGANIST_ONLY_EUCHARIST, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10 });
  }

  // Resolve each selection to a preset, creating bespoke presets for service
  // types the standard three don't cover (Evensong, Matins, …).
  const patternPresetIds: string[] = [];
  if (selections && selections.length > 0) {
    for (const selection of selections) {
      if (selection.type === "SUNG_EUCHARIST") {
        patternPresetIds.push(choralId);
        continue;
      }
      if (selection.type === "SAID_EUCHARIST") {
        patternPresetIds.push(presetIds.SAID_EUCHARIST);
        continue;
      }
      const isChoral = CHORAL_SERVICE_TYPES.has(selection.type);
      const [row] = await tx
        .insert(churchServicePresets)
        .values({
          churchId,
          name: SERVICE_TYPE_LABELS[selection.type as ServiceType] ?? selection.type,
          serviceType: selection.type,
          choirRequirement: isChoral ? "FULL_CHOIR" : "ORGANIST_ONLY",
          musicListFieldSet: isChoral ? "CHORAL" : "HYMNS_ONLY",
          defaultTime: selection.time ?? null,
          liturgicalSeasonTags: [],
        })
        .returning({ id: churchServicePresets.id });
      if (isChoral) {
        const slots = choralSlotsFor(row.id);
        if (slots.length > 0) await tx.insert(presetRoleSlots).values(slots);
      } else if (org) {
        await tx.insert(presetRoleSlots).values({ presetId: row.id, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10 });
      }
      patternPresetIds.push(row.id);
    }
  } else {
    // No explicit selections: the standard Sunday choral service.
    patternPresetIds.push(choralId);
  }

  // One Sunday pattern per distinct preset (the services generator dedupes on
  // (liturgicalDay, serviceType), and the table is unique on
  // (churchId, dayOfWeek, presetId)).
  const uniquePresetIds = [...new Set(patternPresetIds)];
  await tx.insert(churchServicePatterns).values(
    uniquePresetIds.map((presetId) => ({ churchId, dayOfWeek: 0, enabled: true, presetId })),
  );

  return { choralPresetId: choralId };
}
