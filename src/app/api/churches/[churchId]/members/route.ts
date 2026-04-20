import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { memberInviteSchema, quickInviteSchema } from "@/lib/validation/schemas";
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

  const rateLimited = await rateLimit(`invite:${user!.id}`, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const hasEmail = body.email && typeof body.email === "string" && body.email.trim() !== "";
  let email: string | null = null;
  let validatedRole: "ADMIN" | "EDITOR" | "MEMBER";
  let sendEmail = false;

  if (hasEmail) {
    const parsed = memberInviteSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);
    email = parsed.data.email;
    validatedRole = parsed.data.role;
    sendEmail = parsed.data.sendEmail;
  } else {
    const parsed = quickInviteSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);
    validatedRole = parsed.data.role;
  }

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

    // Send invite email if requested and email is provided. Record success
    // or failure on the invite row so the admin UI can surface "resend" and
    // so operators can alert on a rising error rate.
    let emailSendError: string | null = null;
    if (email && sendEmail) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteUrl = `${appUrl}/invite/${token}`;
        await sendInvitation(email, church?.name ?? "a church", user!.name ?? "An administrator", inviteUrl);
        await db
          .update(invites)
          .set({ emailSentAt: new Date(), lastSendError: null })
          .where(eq(invites.id, invite.id));
      } catch (emailError) {
        emailSendError = emailError instanceof Error ? emailError.message : String(emailError);
        logger.error("Failed to send invite email", emailError, {
          inviteId: invite.id,
          email,
        });
        await db
          .update(invites)
          .set({ lastSendError: emailSendError })
          .where(eq(invites.id, invite.id))
          .catch(() => {
            // If we can't record the failure either, nothing more to do — log
            // line above already raised the primary error.
          });
      }
    }

    return NextResponse.json(
      {
        success: true,
        token,
        inviteId: invite.id,
        emailDelivery: email && sendEmail
          ? emailSendError
            ? { status: "failed", error: emailSendError }
            : { status: "sent" }
          : { status: "skipped" },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to create invite", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
