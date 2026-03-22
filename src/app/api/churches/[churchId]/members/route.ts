import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { randomBytes } from "crypto";

const VALID_ROLES = ["ADMIN", "EDITOR", "MEMBER"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { email, role, sendEmail } = body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const validatedRole = VALID_ROLES.includes(role) ? role : "MEMBER";

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

    // Send invite email if requested
    if (sendEmail !== false) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        // Use server-side configured origin to prevent spoofing
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\.supabase\.co.*/, "") || "";
        const inviteUrl = `${appUrl}/invite/${token}`;

        await resend.emails.send({
          from: "Precentor <noreply@resend.dev>",
          to: email,
          subject: "You've been invited to join a church on Precentor",
          html: `
            <p>You've been invited to join a church on Precentor as a <strong>${escapeHtml(validatedRole)}</strong>.</p>
            <p><a href="${escapeHtml(inviteUrl)}">Click here to accept the invite</a></p>
            <p>This link expires in 7 days.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the request if email fails — the link still works
      }
    }

    return NextResponse.json({
      success: true,
      token,
      inviteId: invite.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
