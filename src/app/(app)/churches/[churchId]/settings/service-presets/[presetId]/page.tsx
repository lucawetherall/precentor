import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchServicePresets, presetRoleSlots, roleCatalog } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { PresetDetailClient } from "./preset-detail-client";

export default async function PresetDetailPage({ params }: { params: Promise<{ churchId: string; presetId: string }> }) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const [preset] = await db.select().from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId))).limit(1);
  if (!preset) redirect(`/churches/${churchId}/settings/service-presets`);

  const slots = await db.select().from(presetRoleSlots)
    .where(eq(presetRoleSlots.presetId, presetId))
    .orderBy(asc(presetRoleSlots.displayOrder));

  const catalog = await db.select().from(roleCatalog)
    .where(eq(roleCatalog.rotaEligible, true))
    .orderBy(asc(roleCatalog.displayOrder));

  return <PresetDetailClient churchId={churchId} preset={preset} slots={slots} catalog={catalog} />;
}
