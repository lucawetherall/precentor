import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, asc, and, max } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const sectionCreateSchema = z.object({
  sectionKey: z.string().min(1, "sectionKey is required").max(200, "sectionKey must be 200 characters or fewer"),
  title: z.string().min(1, "title is required").max(500, "title must be 500 characters or fewer"),
  musicSlotType: z.enum(musicSlotTypeEnum.enumValues, "Invalid musicSlotType").nullable().optional(),
  placeholderType: z.string().max(100, "placeholderType must be a string of 100 characters or fewer").nullable().optional(),
  positionOrder: z.number().int().positive("positionOrder must be a positive integer").optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const sections = await db
      .select()
      .from(serviceSections)
      .where(eq(serviceSections.serviceId, serviceId))
      .orderBy(asc(serviceSections.positionOrder));

    return NextResponse.json(sections);
  } catch (err) {
    logger.error("Failed to fetch service sections", err);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, sectionCreateSchema);
  if (bodyError) return bodyError;
  const { sectionKey, title, musicSlotType, placeholderType, positionOrder } = data;

  try {
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    let resolvedPosition: number;
    if (positionOrder !== undefined) {
      resolvedPosition = positionOrder;
    } else {
      // Append after current max
      const [maxResult] = await db
        .select({ maxPos: max(serviceSections.positionOrder) })
        .from(serviceSections)
        .where(eq(serviceSections.serviceId, serviceId));
      resolvedPosition = (maxResult?.maxPos ?? 0) + 1;
    }

    const [created] = await db
      .insert(serviceSections)
      .values({
        serviceId,
        sectionKey,
        title,
        positionOrder: resolvedPosition,
        musicSlotType: musicSlotType ?? null,
        placeholderType: placeholderType ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    logger.error("Failed to create service section", err);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
