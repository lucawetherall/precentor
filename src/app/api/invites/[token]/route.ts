import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites, churches } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Rate-limit by IP so an attacker can't burn through token space.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limited = rateLimit(`invite-get:${ip}`, { maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const result = await db
      .select({
        email: invites.email,
        role: invites.role,
        churchName: churches.name,
      })
      .from(invites)
      .innerJoin(churches, eq(invites.churchId, churches.id))
      .where(
        and(
          eq(invites.token, token),
          isNull(invites.acceptedAt),
          gt(invites.expiresAt, new Date())
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invite." }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    logger.error("Failed to fetch invite", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}
