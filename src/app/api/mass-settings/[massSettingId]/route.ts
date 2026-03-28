import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { massSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ massSettingId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { massSettingId } = await params;

  const result = await db
    .select()
    .from(massSettings)
    .where(eq(massSettings.id, massSettingId))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const setting = result[0];

  return NextResponse.json({
    id: setting.id,
    name: setting.name,
    composer: setting.composer,
    movements: setting.movements,
  });
}
