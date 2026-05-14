import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches, churchMemberships, users, liturgicalDays, services, serviceTypeEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Cap the defaultServices array — each entry fans out to one row per
// liturgical day, so without a ceiling an attacker could exhaust the
// transaction with a single request.
const MAX_DEFAULT_SERVICES = 20;
const TIME_RE = /^\d{2}:\d{2}$/;

const churchCreateSchema = z.object({
  name: z
    .string("Church name is required")
    .trim()
    .min(1, "Church name is required")
    .max(200, "Church name must be 200 characters or less"),
  diocese: z.string().max(200, "diocese must be a string of 200 characters or fewer").nullable().optional(),
  address: z.string().max(500, "address must be a string of 500 characters or fewer").nullable().optional(),
  ccliNumber: z.string().max(50, "ccliNumber must be a string of 50 characters or fewer").nullable().optional(),
  defaultServices: z
    .array(
      z.object({
        type: z.enum(
          serviceTypeEnum.enumValues,
          `defaultServices entries must have a valid type (one of ${serviceTypeEnum.enumValues.join(", ")})`,
        ),
        time: z.string().regex(TIME_RE, "defaultServices.time must be in HH:MM format").nullable().optional(),
      }),
    )
    .max(MAX_DEFAULT_SERVICES, `defaultServices may contain at most ${MAX_DEFAULT_SERVICES} entries`)
    .nullable()
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error: bodyError } = await parseJsonBody(request, churchCreateSchema);
  if (bodyError) return bodyError;
  const { name, diocese, address, ccliNumber, defaultServices } = data;

  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const slug = slugify(name) + "-" + Date.now().toString(36);
    const hasDefaults = !!defaultServices && defaultServices.length > 0;

    // Wrap the church + membership + settings + services inserts in a single
    // transaction so a partial failure (e.g. a service batch dies mid-insert)
    // doesn't leave a church with no admin or no services visible.
    const church = await db.transaction(async (tx) => {
      const [created] = await tx.insert(churches).values({
        name,
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
          defaultServices!.map((svc) => ({
            churchId: created.id,
            liturgicalDayId: day.id,
            serviceType: svc.type,
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
