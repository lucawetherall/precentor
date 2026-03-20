import { NextResponse } from "next/server";
import { parseICalFeed } from "@/lib/ical/parser";
import { importICalFeed } from "@/lib/ical/mapper";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
