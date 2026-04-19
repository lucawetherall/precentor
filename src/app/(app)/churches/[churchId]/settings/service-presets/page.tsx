import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { PresetsClient } from "./presets-client";

export default async function PresetsPage({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const presets = await db.select().from(churchServicePresets)
    .where(and(eq(churchServicePresets.churchId, churchId), isNull(churchServicePresets.archivedAt)))
    .orderBy(asc(churchServicePresets.name));

  return <PresetsClient churchId={churchId} presets={presets} />;
}
