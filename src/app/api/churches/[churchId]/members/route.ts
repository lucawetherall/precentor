import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { invites, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { user, error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const body = await request.json();
  const { email, role, sendEmail } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await db.insert(invites).values({
      churchId,
      email,
      role: (role || "MEMBER") as "ADMIN" | "EDITOR" | "MEMBER",
      token,
      invitedBy: user!.id,
      expiresAt,
    }).returning();

    // Send invite email if requested
    if (sendEmail !== false) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const origin = request.headers.get("origin") || request.headers.get("x-forwarded-host") || "";
        const inviteUrl = `${origin}/invite/${token}`;

        await resend.emails.send({
          from: "Precentor <noreply@resend.dev>",
          to: email,
          subject: "You've been invited to join a church on Precentor",
          html: `
            <p>You've been invited to join a church on Precentor as a <strong>${role || "MEMBER"}</strong>.</p>
            <p><a href="${inviteUrl}">Click here to accept the invite</a></p>
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
