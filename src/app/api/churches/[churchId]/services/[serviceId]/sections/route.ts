import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections, musicSlotTypeEnum, services } from "@/lib/db/schema";
import { eq, asc, and, max } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    // Verify the service belongs to this church
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sectionKey, title, musicSlotType, placeholderType, positionOrder } = body as {
    sectionKey?: unknown;
    title?: unknown;
    musicSlotType?: unknown;
    placeholderType?: unknown;
    positionOrder?: unknown;
  };

  if (typeof sectionKey !== "string" || !sectionKey) {
    return NextResponse.json({ error: "sectionKey is required" }, { status: 400 });
  }
  if (typeof title !== "string" || !title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (musicSlotType !== undefined && musicSlotType !== null) {
    if (!musicSlotTypeEnum.enumValues.includes(musicSlotType as (typeof musicSlotTypeEnum.enumValues)[number])) {
      return NextResponse.json({ error: "Invalid musicSlotType" }, { status: 400 });
    }
  }
  if (positionOrder !== undefined && (!Number.isInteger(positionOrder) || (positionOrder as number) < 1)) {
    return NextResponse.json({ error: "positionOrder must be a positive integer" }, { status: 400 });
  }

  try {
    // Verify the service belongs to this church
    const [service] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    let resolvedPosition: number;
    if (typeof positionOrder === "number") {
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
        musicSlotType: (musicSlotType ?? null) as (typeof musicSlotTypeEnum.enumValues)[number] | null,
        placeholderType: typeof placeholderType === "string" ? placeholderType : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    logger.error("Failed to create service section", err);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
