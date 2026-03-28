import { NextResponse } from "next/server";
import { addMonths, format } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import { generateServicesForChurch } from "@/lib/services/auto-generate";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: { months?: number } = {};
  try {
    body = await request.json();
  } catch {
    // No body or invalid JSON — use defaults
  }

  const months = typeof body.months === "number" && body.months > 0 ? body.months : 3;

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
