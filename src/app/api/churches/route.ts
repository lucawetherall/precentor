import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches, churchMemberships, users, serviceTypeEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";
import { createDefaultChurchSetup } from "@/lib/churches/default-setup";
import { generateServicesForChurch } from "@/lib/services/auto-generate";
import { ensureQualifyingServices } from "@/lib/services/ensure-qualifying-services";
import { getChurchYear } from "@/lib/lectionary/calendar";
import { format } from "date-fns";

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

    // Wrap the church + membership + settings inserts in a single transaction
    // so a partial failure doesn't leave a church with no admin or no presets.
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

      // Seed the standard presets + Sunday patterns. When the admin ticked
      // specific services, each becomes a preset + pattern so the generated
      // services carry sections, music slots, and role slots — the old path
      // that bulk-inserted bare service rows produced services with no
      // running order and a dead rota.
      await createDefaultChurchSetup(tx, created.id, hasDefaults ? defaultServices! : undefined);

      return created;
    });

    // Fan the Sunday patterns out into actual services for the rest of the
    // current church year. Best-effort: a failure here must not fail church
    // creation — the admin can re-generate from Settings → Service Patterns.
    // Cover all seeded liturgical days from today through the next church year
    // so the new church starts with a full set of upcoming services.
    const { endYear } = getChurchYear(new Date());
    const today = format(new Date(), "yyyy-MM-dd");
    const through = `${endYear + 1}-12-31`;
    try {
      await generateServicesForChurch(church.id, today, through);
    } catch (genErr) {
      logger.error("Failed to generate default services for new church", genErr);
    }
    // Separate best-effort pass so a generate failure doesn't suppress the
    // safety net that guarantees every Sunday / Principal Feast / Holy Day has
    // a service even for a church with no Sunday pattern. Idempotent.
    try {
      await ensureQualifyingServices(church.id, today, through);
    } catch (ensureErr) {
      logger.error("Failed to ensure qualifying services for new church", ensureErr);
    }

    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    logger.error("Failed to create church", error);
    return NextResponse.json({ error: "Failed to create church" }, { status: 500 });
  }
}
