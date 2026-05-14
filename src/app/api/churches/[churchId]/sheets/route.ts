import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { parseJsonBody } from "@/lib/api/parse-body";

const sheetsPostSchema = z.object({
  serviceIds: z
    .array(z.string())
    .min(1, "serviceIds required")
    .max(20, "Maximum 20 services per batch"),
  format: z.enum(["pdf", "docx"]).default("pdf"),
  size: z.enum(["A4", "A5"]).default("A4"),
  mode: z.enum(["booklet", "summary"]).default("summary"),
});

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

  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, sheetsPostSchema);
  if (bodyError) return bodyError;

  try {
    const { serviceIds, format, size: pageSize, mode } = data;

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
