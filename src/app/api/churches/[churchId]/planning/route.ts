import { NextRequest, NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { getPlanningData } from "@/lib/planning/data";
import { dateRangeSchema } from "./schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const url = new URL(req.url);
  // Validate the range as real calendar dates before it hits the DATE column —
  // a malformed value would otherwise throw inside Postgres and surface as a 500.
  const parsed = dateRangeSchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "from and to must be valid YYYY-MM-DD dates" }, { status: 400 });
  }

  const data = await getPlanningData(churchId, parsed.data.from, parsed.data.to);
  return NextResponse.json(data);
}
