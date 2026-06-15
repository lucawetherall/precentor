import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites, churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { inviteCreateSchema, emailSchema } from "@/lib/validation/schemas";
import { apiError } from "@/lib/api-helpers";
import { parseJsonBody } from "@/lib/api/parse-body";
import { rateLimit } from "@/lib/rate-limit";
import { sendInvitation } from "@/lib/email/send";
import { env } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const rateLimited = await rateLimit(`invite:${user!.id}`, { maxRequests: 10, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const { data, error: bodyError } = await parseJsonBody(request, inviteCreateSchema);
  if (bodyError) return bodyError;

  const trimmedEmail = data.email?.trim() ?? "";
  let email: string | null = null;
  let sendEmail = false;

  if (trimmedEmail !== "") {
    // Empty/missing email is the "quick invite" path. A non-empty value must
    // still match emailSchema — quietly accepting `{ email: "not-an-email" }`
    // as a tokenless invite would surprise admins typing a typo.
    const emailResult = emailSchema.safeParse(trimmedEmail);
    if (!emailResult.success) return apiError(emailResult.error.issues[0].message, 400);
    email = emailResult.data;
    sendEmail = data.sendEmail;
  }

  const validatedRole = data.role;

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
        // env proxy falls back to the production URL, so a missing var can
        // never email out a localhost invite link.
        const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
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
