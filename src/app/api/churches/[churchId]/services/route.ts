import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { services, serviceTypeEnum } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { liturgicalDayId, serviceType, time } = body;

  if (!liturgicalDayId || typeof liturgicalDayId !== "string") {
    return NextResponse.json({ error: "liturgicalDayId is required" }, { status: 400 });
  }
  if (!serviceType || !(serviceTypeEnum.enumValues as readonly string[]).includes(serviceType)) {
    return NextResponse.json(
      { error: `serviceType must be one of: ${serviceTypeEnum.enumValues.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const [service] = await db.insert(services).values({
      churchId,
      liturgicalDayId,
      serviceType: serviceType as (typeof serviceTypeEnum.enumValues)[number],
      time: time || null,
    }).returning();

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    logger.error("Failed to create service", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
