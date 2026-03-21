import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireMembership, VALID_ROLES, isValidEnum } from "@/lib/auth/membership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authResult = await requireMembership(user.id, churchId, "ADMIN");
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const assignedRole = role || "MEMBER";
  if (!isValidEnum(assignedRole, VALID_ROLES)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    // Find or create user by email
    let targetUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (targetUser.length === 0) {
      // Create a placeholder user record — they'll be linked when they sign up
      const [newUser] = await db.insert(users).values({
        email,
        supabaseId: `pending-${Date.now()}`,
      }).returning();
      targetUser = [newUser];
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, targetUser[0].id),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    await db.insert(churchMemberships).values({
      userId: targetUser[0].id,
      churchId,
      role: assignedRole,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to invite member:", error);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}
