import { NextResponse } from "next/server";
import { parseICalFeed } from "@/lib/ical/parser";
import { importICalFeed } from "@/lib/ical/mapper";

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const icalUrl = process.env.OREMUS_ICAL_URL;
    if (!icalUrl) {
      return NextResponse.json({ error: "OREMUS_ICAL_URL not configured" }, { status: 500 });
    }

    const response = await fetch(icalUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch iCal feed: ${response.statusText}` },
        { status: 502 }
      );
    }

    const icsContent = await response.text();
    const parsedDays = parseICalFeed(icsContent);
    const result = await importICalFeed(parsedDays);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lectionary sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
