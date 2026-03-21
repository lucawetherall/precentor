import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseICalFeed } from "@/lib/ical/parser";
import { importICalFeed } from "@/lib/ical/mapper";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!file.name.endsWith(".ics")) {
      return NextResponse.json({ error: "Only .ics files are accepted" }, { status: 400 });
    }

    const icsContent = await file.text();
    const parsedDays = parseICalFeed(icsContent);
    const result = await importICalFeed(parsedDays);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Manual iCal import failed:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
