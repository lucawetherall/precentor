import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  churchServicePatterns,
  churchServicePresets,
  services,
  liturgicalDays,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { snapshotPresetOntoServices } from "@/lib/services/auto-generate";

/**
 * The preset a backfill service is created from. Carries everything the
 * `services_preset_when_active` check constraint and the row insert need.
 */
interface FallbackPreset {
  id: string;
  serviceType: (typeof churchServicePresets.$inferSelect)["serviceType"];
  defaultTime: string | null;
}

/**
 * Resolve the preset to use for auto-created services on days the church has no
 * pattern for. Prefer the church's enabled Sunday (dayOfWeek 0) pattern so the
 * fallback matches the church's own default; otherwise fall back to any
 * SUNG_EUCHARIST preset, then any preset at all. Returns null only if the
 * church has no presets — in which case we cannot satisfy the
 * `services_preset_when_active` check and must skip.
 */
async function resolveFallbackPreset(churchId: string): Promise<FallbackPreset | null> {
  const [sundayPattern] = await db
    .select({
      id: churchServicePresets.id,
      serviceType: churchServicePresets.serviceType,
      defaultTime: churchServicePresets.defaultTime,
    })
    .from(churchServicePatterns)
    .innerJoin(churchServicePresets, eq(churchServicePatterns.presetId, churchServicePresets.id))
    .where(
      and(
        eq(churchServicePatterns.churchId, churchId),
        eq(churchServicePatterns.dayOfWeek, 0),
        eq(churchServicePatterns.enabled, true),
      ),
    )
    .limit(1);
  if (sundayPattern) return sundayPattern;

  const presets = await db
    .select({
      id: churchServicePresets.id,
      serviceType: churchServicePresets.serviceType,
      defaultTime: churchServicePresets.defaultTime,
    })
    .from(churchServicePresets)
    .where(eq(churchServicePresets.churchId, churchId));
  if (presets.length === 0) return null;

  return presets.find((p) => p.serviceType === "SUNG_EUCHARIST") ?? presets[0];
}

/**
 * Guarantee that every liturgical day in `[fromDate, toDate]` has at least one
 * service for this church, so no principal service ever reads "no service
 * created yet". The calendar seed only ever emits Sundays + Principal Feasts +
 * Holy Days as liturgical days, so "every dayless liturgical day" is exactly
 * "every Sunday + Principal Feast + Holy Day without a service".
 *
 * Idempotent: only days with zero existing services get a row, and the insert
 * relies on the `service_unique` index with ON CONFLICT DO NOTHING, so a second
 * run inserts nothing. Every created row carries a real `presetId`, so the
 * `services_preset_when_active` check constraint is always satisfied.
 */
export async function ensureQualifyingServices(
  churchId: string,
  fromDate: string,
  toDate: string,
): Promise<{ created: number }> {
  const days = await db
    .select({ id: liturgicalDays.id, season: liturgicalDays.season })
    .from(liturgicalDays)
    .where(and(gte(liturgicalDays.date, fromDate), lte(liturgicalDays.date, toDate)));
  if (days.length === 0) return { created: 0 };

  const dayIds = days.map((d) => d.id);
  const existing = await db
    .select({ liturgicalDayId: services.liturgicalDayId })
    .from(services)
    .where(and(eq(services.churchId, churchId), inArray(services.liturgicalDayId, dayIds)));
  const hasService = new Set(existing.map((e) => e.liturgicalDayId));

  const missing = days.filter((d) => !hasService.has(d.id));
  if (missing.length === 0) return { created: 0 };

  const preset = await resolveFallbackPreset(churchId);
  if (!preset) {
    logger.warn("ensureQualifyingServices: church has no preset, skipping", { churchId });
    return { created: 0 };
  }

  const inserted = await db
    .insert(services)
    .values(
      missing.map((d) => ({
        churchId,
        liturgicalDayId: d.id,
        serviceType: preset.serviceType,
        time: preset.defaultTime ?? null,
        presetId: preset.id,
        status: "DRAFT" as const,
      })),
    )
    .onConflictDoNothing()
    .returning({
      id: services.id,
      liturgicalDayId: services.liturgicalDayId,
      serviceType: services.serviceType,
      presetId: services.presetId,
    });

  if (inserted.length === 0) return { created: 0 };

  const daysById = new Map(days.map((d) => [d.id, { season: d.season }]));
  await snapshotPresetOntoServices(churchId, inserted, daysById);

  return { created: inserted.length };
}
