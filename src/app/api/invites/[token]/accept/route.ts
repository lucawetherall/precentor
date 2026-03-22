import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { invites, churches, users, churchMemberships } from "@/lib/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find valid invite
    const inviteResult = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, token),
          isNull(invites.acceptedAt),
          gt(invites.expiresAt, new Date())
        )
      )
      .limit(1);

    if (inviteResult.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invite." }, { status: 404 });
    }

    const invite = inviteResult[0];

    // Verify the authenticated user's email matches the invite
    if (authUser.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address." },
        { status: 403 }
      );
    }

    // Find or create the DB user
    let dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, authUser.id))
      .limit(1);

    if (dbUser.length === 0) {
      const [newUser] = await db.insert(users).values({
        email: authUser.email || invite.email,
        supabaseId: authUser.id,
        name: authUser.user_metadata?.name || null,
      }).returning();
      dbUser = [newUser];
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, dbUser[0].id),
          eq(churchMemberships.churchId, invite.churchId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(churchMemberships).values({
        userId: dbUser[0].id,
        churchId: invite.churchId,
        role: invite.role,
      });
    }

    // Mark invite as accepted
    await db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id));

    return NextResponse.json({ churchId: invite.churchId });
  } catch (error) {
    console.error("Failed to accept invite:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
