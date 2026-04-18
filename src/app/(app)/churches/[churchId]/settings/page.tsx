import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { ChurchSettingsForm } from "./settings-form";
import { readSheetMusicLink } from "@/lib/churches/settings";

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

  const churchForForm = {
    id: church.id,
    name: church.name,
    diocese: church.diocese,
    address: church.address,
    ccliNumber: church.ccliNumber,
    sheetMusicLink: readSheetMusicLink(church.settings),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg">
      <h1 className="text-3xl font-heading font-semibold mb-6">Church Settings</h1>
      <ChurchSettingsForm church={churchForForm} />
    </div>
  );
}
