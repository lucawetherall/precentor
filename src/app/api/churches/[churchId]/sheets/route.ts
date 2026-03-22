import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { services, liturgicalDays, readings, musicSlots, churches, hymns } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { MultiServiceSheetDocument, type ServiceSheetData } from "@/lib/pdf/service-sheet";
import { generateMultiServiceDocx } from "@/lib/pdf/service-sheet-docx";
import { MUSIC_SLOT_LABELS } from "@/types";

/**
 * POST /api/churches/[churchId]/sheets
 * Body: { serviceIds: string[], format?: "pdf" | "docx", size?: "A4" | "A5" }
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

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json({ error: "serviceIds required" }, { status: 400 });
    }
    if (serviceIds.length > 20) {
      return NextResponse.json({ error: "Maximum 20 services per batch" }, { status: 400 });
    }

    // Fetch all services
    const serviceResults = await db
      .select({
        service: services,
        day: liturgicalDays,
        church: churches,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .innerJoin(churches, eq(services.churchId, churches.id))
      .where(inArray(services.id, serviceIds));

    if (serviceResults.length === 0) {
      return NextResponse.json({ error: "No services found" }, { status: 404 });
    }

    // Build sheet data for each service
    const sheets: ServiceSheetData[] = [];
    for (const { service, day, church } of serviceResults) {
      const dayReadings = await db
        .select()
        .from(readings)
        .where(eq(readings.liturgicalDayId, day.id));

      const slotsRaw = await db
        .select({
          slot: musicSlots,
          hymn: {
            book: hymns.book,
            number: hymns.number,
            firstLine: hymns.firstLine,
          },
        })
        .from(musicSlots)
        .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
        .where(eq(musicSlots.serviceId, service.id))
        .orderBy(musicSlots.positionOrder);

      sheets.push({
        churchName: church.name,
        serviceType: service.serviceType,
        date: day.date,
        liturgicalName: day.cwName,
        season: day.season,
        colour: day.colour,
        collect: day.collect || undefined,
        format: pageSize,
        readings: dayReadings.map((r) => ({
          position: r.position,
          reference: r.reference,
        })),
        musicSlots: slotsRaw.map((s) => ({
          label: (MUSIC_SLOT_LABELS as Record<string, string>)[s.slot.slotType] || s.slot.slotType,
          value: s.hymn?.firstLine || s.slot.freeText || "TBC",
          hymnNumber: s.hymn ? `${s.hymn.book} ${s.hymn.number}` : undefined,
          notes: s.slot.notes || undefined,
        })),
      });
    }

    // Sort by date
    sheets.sort((a, b) => a.date.localeCompare(b.date));

    const filename = `service-sheets-${sheets[0].date}-to-${sheets[sheets.length - 1].date}`;

    if (format === "docx") {
      const buffer = await generateMultiServiceDocx(sheets);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    // PDF
    const pdfElement = React.createElement(MultiServiceSheetDocument, { sheets });
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
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
