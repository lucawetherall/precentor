import { db } from "@/lib/db";
import {
  roleCatalog,
  churchServicePresets,
  presetRoleSlots,
  churchServicePatterns,
} from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The three presets every church starts with (mirrors the Phase D migration so
// new churches match migrated ones). Default Choral is the Sunday default.
const DEFAULT_PRESETS = [
  { key: "DEFAULT_CHORAL", name: "Default Choral", serviceType: "SUNG_EUCHARIST", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL", defaultTime: "10:00" },
  { key: "ORGANIST_ONLY_EUCHARIST", name: "Organist-only Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "ORGANIST_ONLY", musicListFieldSet: "HYMNS_ONLY", defaultTime: null },
  { key: "SAID_EUCHARIST", name: "Said Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "SAID", musicListFieldSet: "READINGS_ONLY", defaultTime: null },
] as const;

/**
 * Seed a newly-created church with the default presets, role slots for the
 * choral preset, and a Sunday pattern pointing at it. Must run inside the
 * church-creation transaction. Returns the Default Choral preset id.
 *
 * Call `generateServicesForChurch` AFTER the transaction commits to fan the
 * Sunday pattern out into actual services.
 */
export async function createDefaultChurchSetup(tx: Tx, churchId: string): Promise<{ choralPresetId: string }> {
  const catalog = await tx.select().from(roleCatalog);
  const byKey = new Map(catalog.map((r) => [r.key, r]));

  const presetIds: Record<string, string> = {};
  for (const p of DEFAULT_PRESETS) {
    const [row] = await tx
      .insert(churchServicePresets)
      .values({
        churchId,
        name: p.name,
        serviceType: p.serviceType,
        choirRequirement: p.choirRequirement,
        musicListFieldSet: p.musicListFieldSet,
        defaultTime: p.defaultTime,
        liturgicalSeasonTags: [],
      })
      .returning({ id: churchServicePresets.id });
    presetIds[p.key] = row.id;
  }

  // Choral preset slots: SATB (non-exclusive), organist + director (exclusive).
  const choralId = presetIds.DEFAULT_CHORAL;
  const voiceParts = ["SOPRANO", "ALTO", "TENOR", "BASS"].map((k) => byKey.get(k)).filter(Boolean) as { id: string }[];
  const org = byKey.get("ORGANIST");
  const dir = byKey.get("DIRECTOR");
  const slots = [
    ...voiceParts.map((v, i) => ({ presetId: choralId, catalogRoleId: v.id, minCount: 1, maxCount: null as number | null, exclusive: false, displayOrder: (i + 1) * 10 })),
    ...(org ? [{ presetId: choralId, catalogRoleId: org.id, minCount: 1, maxCount: 1 as number | null, exclusive: true, displayOrder: 50 }] : []),
    ...(dir ? [{ presetId: choralId, catalogRoleId: dir.id, minCount: 1, maxCount: 1 as number | null, exclusive: true, displayOrder: 60 }] : []),
  ];
  if (slots.length > 0) await tx.insert(presetRoleSlots).values(slots);
  if (org) {
    await tx.insert(presetRoleSlots).values({ presetId: presetIds.ORGANIST_ONLY_EUCHARIST, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10 });
  }

  // Default weekly pattern: Sunday → Default Choral.
  await tx.insert(churchServicePatterns).values({ churchId, dayOfWeek: 0, enabled: true, presetId: choralId });

  return { choralPresetId: choralId };
}
