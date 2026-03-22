import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireChurchRole } from "@/lib/auth/permissions";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  buildBookletData,
  buildSummaryData,
} from "@/lib/pdf/build-sheet-data";
import { MultiBookletDocument } from "@/lib/pdf/booklet-document";
import { MultiSummaryDocument } from "@/lib/pdf/summary-document";
import {
  generateMultiBookletDocx,
  generateMultiSummaryDocx,
} from "@/lib/pdf/service-sheet-docx";
import type { BookletServiceSheetData, SummaryServiceSheetData, TemplateLayout } from "@/types/service-sheet";
import type { SheetMode } from "@/types/service-sheet";

/**
 * POST /api/churches/[churchId]/sheets
 * Body: { serviceIds: string[], format?: "pdf" | "docx", size?: "A4" | "A5", mode?: "booklet" | "summary" }
 * Generates a multi-page document with all requested service sheets.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;

  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const body = await request.json();
    const serviceIds: string[] = body.serviceIds;
    const format: string = body.format || "pdf";
    const pageSize: "A4" | "A5" = body.size === "A5" ? "A5" : "A4";
    const mode: SheetMode = body.mode === "booklet" ? "booklet" : "summary";

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json({ error: "serviceIds required" }, { status: 400 });
    }
    if (serviceIds.length > 20) {
      return NextResponse.json({ error: "Maximum 20 services per batch" }, { status: 400 });
    }

    const layoutOverride: Partial<TemplateLayout> = { paperSize: pageSize };

    if (mode === "booklet") {
      const sheets: BookletServiceSheetData[] = [];
      for (const id of serviceIds) {
        const data = await buildBookletData(id, churchId, layoutOverride);
        if (data) sheets.push(data);
      }

      if (sheets.length === 0) {
        return NextResponse.json({ error: "No services found" }, { status: 404 });
      }

      sheets.sort((a, b) => a.date.localeCompare(b.date));
      const filename = `service-booklets-${sheets[0].date}-to-${sheets[sheets.length - 1].date}`;

      if (format === "docx") {
        const buffer = await generateMultiBookletDocx(sheets);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}.docx"`,
          },
        });
      }

      const pdfElement = React.createElement(MultiBookletDocument, { sheets });
      // @ts-expect-error - react-pdf types are strict about Document props
      const pdfBuffer = await renderToBuffer(pdfElement);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    // Summary mode
    const sheets: SummaryServiceSheetData[] = [];
    for (const id of serviceIds) {
      const data = await buildSummaryData(id, churchId, layoutOverride);
      if (data) sheets.push(data);
    }

    if (sheets.length === 0) {
      return NextResponse.json({ error: "No services found" }, { status: 404 });
    }

    sheets.sort((a, b) => a.date.localeCompare(b.date));
    const filename = `service-sheets-${sheets[0].date}-to-${sheets[sheets.length - 1].date}`;

    if (format === "docx") {
      const buffer = await generateMultiSummaryDocx(sheets);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    const pdfElement = React.createElement(MultiSummaryDocument, { sheets });
    // @ts-expect-error - react-pdf types are strict about Document props
    const pdfBuffer = await renderToBuffer(pdfElement);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Batch service sheet generation failed", error);
    return NextResponse.json(
      { error: "Service sheet generation failed" },
      { status: 500 }
    );
  }
}
