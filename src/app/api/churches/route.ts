import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches, churchMemberships, users, liturgicalDays, services } from "@/lib/db/schema";
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

  const body = await request.json();
  const { name, diocese, address, ccliNumber, defaultServices } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Church name is required" }, { status: 400 });
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

      for (const day of allDays) {
        for (const svc of defaultServices) {
          try {
            await db
              .insert(services)
              .values({
                churchId: church.id,
                liturgicalDayId: day.id,
                serviceType: svc.type,
                time: svc.time,
                status: "DRAFT",
              })
              .onConflictDoNothing();
          } catch {
            // Skip constraint violations
          }
        }
      }
    }

    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    logger.error("Failed to create church", error);
    return NextResponse.json({ error: "Failed to create church" }, { status: 500 });
  }
}
