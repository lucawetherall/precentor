import { NextResponse } from "next/server";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import { generateServicesForChurch } from "@/lib/services/auto-generate";
import { logger } from "@/lib/logger";

const generateServicesSchema = z.object({
  months: z.number().int().positive().max(12).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  // This endpoint accepts an empty body, so we hand-parse instead of using
  // parseJsonBody — missing body should fall back to defaults, not 400.
  let parsedMonths: number | undefined;
  try {
    const raw = await request.json();
    const result = generateServicesSchema.safeParse(raw);
    if (result.success) parsedMonths = result.data.months;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const months = parsedMonths ?? 3;

  const today = new Date();
  const fromDate = format(today, "yyyy-MM-dd");
  const toDate = format(addMonths(today, months), "yyyy-MM-dd");

  try {
    const result = await generateServicesForChurch(churchId, fromDate, toDate);
    return NextResponse.json({ created: result.created }, { status: 200 });
  } catch (err) {
    logger.error("Failed to generate services", err);
    return NextResponse.json({ error: "Failed to generate services" }, { status: 500 });
  }
}
