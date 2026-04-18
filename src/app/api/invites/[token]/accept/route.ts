import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { invites, users, churchMemberships } from "@/lib/db/schema";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Rate limit by IP to prevent brute-force token enumeration.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limited = await rateLimit(`invite-accept:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find valid invite outside the transaction so we can fail fast with 404.
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

    // Skip email check for open invites (no recipient email specified).
    if (invite.email) {
      if (authUser.email?.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invite was sent to a different email address." },
          { status: 403 }
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      // Atomic claim: mark accepted only if still unclaimed.
      // Concurrent accepts resolve here — losers get `claimed === undefined`.
      const [claimed] = await tx
        .update(invites)
        .set({ acceptedAt: new Date() })
        .where(and(eq(invites.id, invite.id), isNull(invites.acceptedAt)))
        .returning();

      if (!claimed) {
        return { alreadyAccepted: true as const };
      }

      // Upsert the user record keyed by supabaseId (unique).
      const existing = await tx
        .select()
        .from(users)
        .where(eq(users.supabaseId, authUser.id))
        .limit(1);

      let userId: string;
      if (existing.length > 0) {
        userId = existing[0].id;
      } else {
        // Normalise email to lowercase for case-insensitive uniqueness.
        // Reject if neither auth provider nor invite supplied an email — we
        // must never persist an empty-string email and collide on the unique index.
        const rawEmail = authUser.email || invite.email;
        if (!rawEmail) {
          return { missingEmail: true as const };
        }
        const emailValue = rawEmail.toLowerCase();
        const [newUser] = await tx
          .insert(users)
          .values({
            email: emailValue,
            supabaseId: authUser.id,
            name: authUser.user_metadata?.name || null,
          })
          .onConflictDoUpdate({
            target: users.supabaseId,
            set: { updatedAt: sql`now()` },
          })
          .returning();
        userId = newUser.id;
      }

      await tx
        .insert(churchMemberships)
        .values({
          userId,
          churchId: claimed.churchId,
          role: claimed.role,
        })
        .onConflictDoNothing();

      return { alreadyAccepted: false as const, churchId: claimed.churchId };
    });

    if ("missingEmail" in result && result.missingEmail) {
      return NextResponse.json(
        { error: "No email address available on your account or this invite." },
        { status: 400 }
      );
    }
    if ("alreadyAccepted" in result && result.alreadyAccepted) {
      return NextResponse.json({ error: "Invite already accepted." }, { status: 409 });
    }

    return NextResponse.json({ churchId: (result as { churchId: string }).churchId });
  } catch (error) {
    logger.error("Failed to accept invite", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
