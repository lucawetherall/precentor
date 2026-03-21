import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { requireMembership, VALID_SERVICE_TYPES, isValidEnum } from "@/lib/auth/membership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authResult = await requireMembership(user.id, churchId, "EDITOR");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const { liturgicalDayId, serviceType, time } = body;

  if (!isValidEnum(serviceType, VALID_SERVICE_TYPES)) {
    return NextResponse.json({ error: "Invalid service type" }, { status: 400 });
  }

  try {
    const [service] = await db.insert(services).values({
      churchId,
      liturgicalDayId,
      serviceType,
      time: time || null,
    }).returning();

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
