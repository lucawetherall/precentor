import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { ChurchSettingsForm } from "./settings-form";
import { useRoleSlotsModel } from "@/lib/feature-flags";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ChurchSettingsPage({ params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let church: InferSelectModel<typeof churches> | null = null;
  try {
    const result = await db.select().from(churches).where(eq(churches.id, churchId)).limit(1);
    church = result[0] || null;
  } catch (err) { console.error("Failed to load data:", err); }

  if (!church) redirect("/churches");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <h1 className="text-3xl font-heading font-semibold mb-6">Church Settings</h1>
      <ChurchSettingsForm church={church} />
      {useRoleSlotsModel() && (
        <nav className="mt-8 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Role configurability</h2>
          <a href={`/churches/${churchId}/settings/service-presets`} className="block rounded-md border px-4 py-3 hover:bg-accent">
            <div className="font-medium">Service presets</div>
            <div className="text-sm text-muted-foreground">Configure role slots for each service type</div>
          </a>
          <a href={`/churches/${churchId}/settings/institution`} className="block rounded-md border px-4 py-3 hover:bg-accent">
            <div className="font-medium">Institution</div>
            <div className="text-sm text-muted-foreground">Assign clergy and institutional appointees</div>
          </a>
        </nav>
      )}
    </div>
  );
}
