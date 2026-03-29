import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches, churchMemberships, users, liturgicalDays, services, serviceTypeEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, diocese, address, ccliNumber, defaultServices } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Church name is required" }, { status: 400 });
  }

  if (name.length > 200) {
    return NextResponse.json({ error: "Church name must be 200 characters or less" }, { status: 400 });
  }

  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const slug = slugify(name) + "-" + Date.now().toString(36);

    const [church] = await db.insert(churches).values({
      name: name.trim(),
      slug,
      diocese: diocese || null,
      address: address || null,
      ccliNumber: ccliNumber || null,
    }).returning();

    // Add creator as ADMIN
    await db.insert(churchMemberships).values({
      userId: dbUser[0].id,
      churchId: church.id,
      role: "ADMIN",
    });

    if (defaultServices && Array.isArray(defaultServices) && defaultServices.length > 0) {
      await db
        .update(churches)
        .set({ settings: { defaultServices } })
        .where(eq(churches.id, church.id));

      const allDays = await db
        .select({ id: liturgicalDays.id })
        .from(liturgicalDays);

      // Batch insert all services instead of one-by-one
      const serviceValues = allDays.flatMap((day) =>
        defaultServices.map((svc: { type: string; time?: string }) => ({
          churchId: church.id,
          liturgicalDayId: day.id,
          serviceType: svc.type as (typeof serviceTypeEnum.enumValues)[number],
          time: svc.time || null,
          status: "DRAFT" as const,
        }))
      );

      // Insert in chunks to avoid query size limits
      const CHUNK_SIZE = 500;
      for (let i = 0; i < serviceValues.length; i += CHUNK_SIZE) {
        const chunk = serviceValues.slice(i, i + CHUNK_SIZE);
        try {
          await db.insert(services).values(chunk).onConflictDoNothing();
        } catch {
          // Skip constraint violations
        }
      }
    }

    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    logger.error("Failed to create church", error);
    return NextResponse.json({ error: "Failed to create church" }, { status: 500 });
  }
}
