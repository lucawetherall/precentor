import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  buildBookletData,
  buildSummaryData,
  resolveSheetMode,
} from "@/lib/pdf/build-sheet-data";
import { BookletDocument } from "@/lib/pdf/booklet-document";
import { SummaryDocument } from "@/lib/pdf/summary-document";
import { generateBookletDocx, generateSummaryDocx } from "@/lib/pdf/service-sheet-docx";
import { SERVICE_TYPE_DISPLAY } from "@/lib/pdf/service-sheet";
import type { TemplateLayout } from "@/types/service-sheet";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const formatParam = request.nextUrl.searchParams.get("format") || "pdf";
  const format = formatParam === "docx" ? "docx" : formatParam === "json" ? "json" : "pdf";
  const sizeParam = request.nextUrl.searchParams.get("size");
  const modeParam = request.nextUrl.searchParams.get("mode");

  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    // Determine sheet mode from service record + query override
    const serviceRecord = await db
      .select({ sheetMode: services.sheetMode })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (serviceRecord.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const mode = resolveSheetMode(serviceRecord[0].sheetMode, modeParam);

    // Return JSON data for browser preview
    if (format === "json") {
      const data =
        mode === "booklet"
          ? await buildBookletData(serviceId, churchId)
          : await buildSummaryData(serviceId, churchId);
      if (!data) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    // Build layout override from query params
    const layoutOverride: Partial<TemplateLayout> = {};
    if (sizeParam === "A4" || sizeParam === "A5") {
      layoutOverride.paperSize = sizeParam;
    }

    if (mode === "booklet") {
      const data = await buildBookletData(serviceId, churchId, layoutOverride);
      if (!data) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }

      const serviceLabel =
        SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType;
      const safeLabel = serviceLabel.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const filename = `${safeLabel}-booklet-${data.date}`;

      if (format === "docx") {
        const buffer = await generateBookletDocx(data);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}.docx"`,
          },
        });
      }

      const pdfElement = React.createElement(BookletDocument, { data });
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
    const data = await buildSummaryData(serviceId, churchId, layoutOverride);
    if (!data) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const serviceLabel =
      SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType;
    const safeLabel = serviceLabel.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const filename = `${safeLabel}-${data.date}`;

    if (format === "docx") {
      const buffer = await generateSummaryDocx(data);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    const pdfElement = React.createElement(SummaryDocument, { data });
    // @ts-expect-error - react-pdf types are strict about Document props
    const pdfBuffer = await renderToBuffer(pdfElement);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Service sheet generation failed", error);
    return NextResponse.json(
      { error: "Service sheet generation failed" },
      { status: 500 }
    );
  }
}
