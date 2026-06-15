import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import Link from "next/link";
import { ChurchSettingsForm } from "./settings-form";
import { readSheetMusicLink, readLectionaryTrack } from "@/lib/churches/settings";
import { getAuthUser, getChurchMembership, hasMinRole, coerceMemberRole } from "@/lib/auth/permissions";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ChurchSettingsPage({ params }: Props) {
  const { churchId } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/login");

  const membership = await getChurchMembership(user.id, churchId);
  if (!membership) redirect("/churches");
  if (!hasMinRole(coerceMemberRole(membership.role), "ADMIN")) {
    redirect(`/churches/${churchId}`);
  }

  let church: InferSelectModel<typeof churches> | null = null;
  try {
    const result = await db.select().from(churches).where(eq(churches.id, churchId)).limit(1);
    church = result[0] || null;
  } catch (err) { logger.error("[settings/page] Failed to load church", err); }

  if (!church) redirect("/churches");

  const churchForForm = {
    id: church.id,
    name: church.name,
    diocese: church.diocese,
    address: church.address,
    ccliNumber: church.ccliNumber,
    sheetMusicLink: readSheetMusicLink(church.settings),
    lectionaryTrack: readLectionaryTrack(church.settings),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <h1 className="text-3xl font-heading font-semibold mb-6">Church Settings</h1>
      <ChurchSettingsForm church={churchForForm} />
      <nav className="mt-8 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">More settings</h2>
        <Link href={`/churches/${churchId}/settings/service-patterns`} className="block rounded-md border px-4 py-3 hover:bg-accent transition-colors">
          <div className="font-medium">Service patterns</div>
          <div className="text-sm text-muted-foreground">Set your regular weekly services and generate upcoming ones</div>
        </Link>
        <Link href={`/churches/${churchId}/settings/templates`} className="block rounded-md border px-4 py-3 hover:bg-accent transition-colors">
          <div className="font-medium">Service templates</div>
          <div className="text-sm text-muted-foreground">Customise the order of service for each service type</div>
        </Link>
        <Link href={`/churches/${churchId}/settings/service-presets`} className="block rounded-md border px-4 py-3 hover:bg-accent transition-colors">
          <div className="font-medium">Service presets</div>
          <div className="text-sm text-muted-foreground">Configure role slots for each service type</div>
        </Link>
        <Link href={`/churches/${churchId}/settings/institution`} className="block rounded-md border px-4 py-3 hover:bg-accent transition-colors">
          <div className="font-medium">Institution</div>
          <div className="text-sm text-muted-foreground">Assign clergy and institutional appointees</div>
        </Link>
        <Link href={`/churches/${churchId}/settings/migration-issues`} className="block rounded-md border px-4 py-3 hover:bg-accent transition-colors">
          <div className="font-medium">Migration issues</div>
          <div className="text-sm text-muted-foreground">Review anything that needs attention after a data import</div>
        </Link>
      </nav>
    </div>
  );
}
