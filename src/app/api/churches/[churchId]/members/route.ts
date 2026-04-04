import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites } from "@/lib/db/schema";
import { randomBytes } from "crypto";
import { memberInviteSchema, quickInviteSchema } from "@/lib/validation/schemas";
import { apiError } from "@/lib/api-helpers";
import { escapeHtml } from "@/lib/utils/escape-html";
import { rateLimit } from "@/lib/rate-limit";

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

    // Send invite email if requested and email is provided
    if (email && sendEmail) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\.supabase\.co.*/, "") || "";
        const inviteUrl = `${appUrl}/invite/${token}`;

        await resend.emails.send({
          from: "Precentor <onboarding@resend.dev>",
          to: email,
          subject: "You've been invited to join a church on Precentor",
          html: `
            <p>You've been invited to join a church on Precentor as a <strong>${escapeHtml(validatedRole)}</strong>.</p>
            <p><a href="${escapeHtml(inviteUrl)}">Click here to accept the invite</a></p>
            <p>This link expires in 7 days.</p>
          `,
        });
      } catch (emailError) {
        logger.error("Failed to send invite email", emailError);
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
