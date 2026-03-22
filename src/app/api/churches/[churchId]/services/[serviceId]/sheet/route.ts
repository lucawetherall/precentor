import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { services, liturgicalDays, readings, musicSlots, churches, hymns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ServiceSheetDocument, type ServiceSheetData } from "@/lib/pdf/service-sheet";
import { SERVICE_TYPE_DISPLAY } from "@/lib/pdf/service-sheet";
import { generateServiceSheetDocx } from "@/lib/pdf/service-sheet-docx";
import { MUSIC_SLOT_LABELS } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const format = request.nextUrl.searchParams.get("format") || "pdf";
  const pageSize = request.nextUrl.searchParams.get("size") === "A5" ? "A5" : "A4";

  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    // Fetch service data
    const serviceResult = await db
      .select({
        service: services,
        day: liturgicalDays,
        church: churches,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .innerJoin(churches, eq(services.churchId, churches.id))
      .where(eq(services.id, serviceId))
      .limit(1);

    if (serviceResult.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const { service, day, church } = serviceResult[0];

    // Fetch readings
    const dayReadings = await db
      .select()
      .from(readings)
      .where(eq(readings.liturgicalDayId, day.id));

    // Fetch music slots with hymn details via left join
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
      .where(eq(musicSlots.serviceId, serviceId))
      .orderBy(musicSlots.positionOrder);

    const serviceLabel = SERVICE_TYPE_DISPLAY[service.serviceType] || service.serviceType;
    const safeLabel = serviceLabel.toLowerCase().replace(/\s+/g, "-");

    const sheetData: ServiceSheetData = {
      churchName: church.name,
      serviceType: service.serviceType,
      date: day.date,
      liturgicalName: day.cwName,
      season: day.season,
      colour: day.colour,
      collect: day.collect || undefined,
      format: pageSize as "A4" | "A5",
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
    };

    const filename = `${safeLabel}-${day.date}`;

    if (format === "docx") {
      const buffer = await generateServiceSheetDocx(sheetData);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    // PDF
    const pdfElement = React.createElement(ServiceSheetDocument, { data: sheetData });
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
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
