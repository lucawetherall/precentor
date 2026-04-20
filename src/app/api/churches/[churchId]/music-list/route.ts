import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireChurchRole } from "@/lib/auth/permissions";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { buildMusicListData } from "@/lib/pdf/music-list/build-music-list-data";
import { MusicListDocument } from "@/lib/pdf/music-list/music-list-document";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

/**
 * GET /api/churches/[churchId]/music-list?from=YYYY-MM-DD&to=YYYY-MM-DD&churchName=...&format=pdf
 * Generates a printable music list PDF for the given date range.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;

  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const churchName = searchParams.get("churchName");
  const format = searchParams.get("format");

  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "from and to (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  // Regex matches the shape; isValid confirms real calendar dates (rejects e.g. 2026-13-45).
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  if (!isValid(fromDate) || !isValid(toDate)) {
    return NextResponse.json(
      { error: "from and to must be real calendar dates" },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }

  if (differenceInCalendarDays(toDate, fromDate) > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range may not exceed ${MAX_RANGE_DAYS} days` },
      { status: 400 }
    );
  }

  if (format && format !== "pdf") {
    return NextResponse.json(
      { error: "Only format=pdf supported" },
      { status: 400 }
    );
  }

  try {
    const data = await buildMusicListData(
      churchId,
      from,
      to,
      churchName ?? undefined
    );
    if (!data) {
      return NextResponse.json({ error: "Church not found" }, { status: 404 });
    }
    if (data.months.length === 0) {
      return NextResponse.json(
        { error: "No services in range" },
        { status: 404 }
      );
    }

    const element = React.createElement(MusicListDocument, { data });
    // @ts-expect-error - react-pdf types are strict about Document props
    const buffer = await renderToBuffer(element);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="music-list-${from}-to-${to}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("Music list PDF generation failed", err);
    return NextResponse.json(
      { error: "Music list generation failed" },
      { status: 500 }
    );
  }
}
