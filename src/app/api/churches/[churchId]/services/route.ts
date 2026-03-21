import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const body = await request.json();
  const { liturgicalDayId, serviceType, time } = body;

  try {
    const [service] = await db.insert(services).values({
      churchId,
      liturgicalDayId,
      serviceType: serviceType as any,
      time: time || null,
    }).returning();

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
