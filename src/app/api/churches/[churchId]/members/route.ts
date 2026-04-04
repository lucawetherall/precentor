import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { memberInviteSchema } from "@/lib/validation/schemas";
import { apiError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { sendInvitation } from "@/lib/email/send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const rateLimited = rateLimit(`invite:${user!.id}`, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = memberInviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);
  const { email, role: validatedRole, sendEmail } = parsed.data;

  try {
    const [church] = await db
      .select({ name: churches.name })
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await db.insert(invites).values({
      churchId,
      email,
      role: validatedRole,
      token,
      invitedBy: user!.id,
      expiresAt,
    }).returning();

    if (sendEmail !== false) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteUrl = `${appUrl}/invite/${token}`;
        await sendInvitation(email, church?.name ?? "a church", user!.name ?? "An administrator", inviteUrl);
      } catch (emailError) {
        logger.error("Failed to send invite email", emailError);
        // Don't fail the request if email fails — the link still works
      }
    }

    return NextResponse.json({
      success: true,
      token,
      inviteId: invite.id,
    }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create invite", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
