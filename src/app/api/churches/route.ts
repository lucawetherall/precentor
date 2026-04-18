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
    const hasDefaults = Array.isArray(defaultServices) && defaultServices.length > 0;

    // Wrap the church + membership + settings + services inserts in a single
    // transaction so a partial failure (e.g. a service batch dies mid-insert)
    // doesn't leave a church with no admin or no services visible.
    const church = await db.transaction(async (tx) => {
      const [created] = await tx.insert(churches).values({
        name: name.trim(),
        slug,
        diocese: diocese || null,
        address: address || null,
        ccliNumber: ccliNumber || null,
        settings: hasDefaults ? { defaultServices } : {},
      }).returning();

      await tx.insert(churchMemberships).values({
        userId: dbUser[0].id,
        churchId: created.id,
        role: "ADMIN",
      });

      if (hasDefaults) {
        const allDays = await tx
          .select({ id: liturgicalDays.id })
          .from(liturgicalDays);

        const serviceValues = allDays.flatMap((day) =>
          (defaultServices as { type: string; time?: string }[]).map((svc) => ({
            churchId: created.id,
            liturgicalDayId: day.id,
            serviceType: svc.type as (typeof serviceTypeEnum.enumValues)[number],
            time: svc.time || null,
            status: "DRAFT" as const,
          }))
        );

        const CHUNK_SIZE = 500;
        for (let i = 0; i < serviceValues.length; i += CHUNK_SIZE) {
          const chunk = serviceValues.slice(i, i + CHUNK_SIZE);
          await tx.insert(services).values(chunk).onConflictDoNothing();
        }
      }

      return created;
    });

    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    logger.error("Failed to create church", error);
    return NextResponse.json({ error: "Failed to create church" }, { status: 500 });
  }
}
