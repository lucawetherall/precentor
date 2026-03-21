import { NextResponse } from "next/server";
import { syncCurrentYear, syncLectionaryForYear } from "@/lib/lectionary/mapper";
import { getChurchYear } from "@/lib/lectionary/calendar";

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fetchText = url.searchParams.get("fetchText") === "true";
    const bibleVersion = url.searchParams.get("version") ?? undefined;

    // Optional: sync a specific year (e.g., ?year=2026)
    const yearParam = url.searchParams.get("year");
    let result;

    if (yearParam) {
      const startYear = parseInt(yearParam, 10);
      result = await syncLectionaryForYear(
        { startYear, endYear: startYear + 1 },
        { fetchText, bibleVersion },
      );
    } else {
      result = await syncCurrentYear({ fetchText, bibleVersion });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Lectionary sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
