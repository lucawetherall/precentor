import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { syncCurrentYear, syncLectionaryForYear } from "@/lib/lectionary/mapper";
import { getChurchYear } from "@/lib/lectionary/calendar";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    logger.error("CRON_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fetchText = url.searchParams.get("fetchText") === "true";
    const bibleVersion = url.searchParams.get("version") ?? undefined;

    // Validate bible version if provided
    const VALID_VERSIONS = ["NRSVAE", "NRSV", "AV", "BCP", "CW"];
    if (bibleVersion && !VALID_VERSIONS.includes(bibleVersion)) {
      return NextResponse.json(
        { error: `Invalid version. Must be one of: ${VALID_VERSIONS.join(", ")}` },
        { status: 400 },
      );
    }

    // Optional: sync a specific year (e.g., ?year=2026)
    const yearParam = url.searchParams.get("year");
    let result;

    if (yearParam) {
      const startYear = parseInt(yearParam, 10);
      if (isNaN(startYear) || startYear < 2000 || startYear > 2100) {
        return NextResponse.json(
          { error: "Invalid year. Must be between 2000 and 2100." },
          { status: 400 },
        );
      }
      result = await syncLectionaryForYear(
        { startYear, endYear: startYear + 1 },
        { fetchText, bibleVersion },
      );
    } else {
      result = await syncCurrentYear({ fetchText, bibleVersion });
    }

    return NextResponse.json({
      success: result.imported > 0 || result.errors === 0,
      ...result,
    });
  } catch (error) {
    logger.error("Lectionary sync failed", error);
    return NextResponse.json(
      { error: "Lectionary sync failed" },
      { status: 500 },
    );
  }
}
