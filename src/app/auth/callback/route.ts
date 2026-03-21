import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Upsert user record
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.supabaseId, user.id))
          .limit(1);

        let dbUserId: string;

        if (existing.length === 0) {
          const [newUser] = await db.insert(users).values({
            email: user.email!,
            supabaseId: user.id,
            name: user.user_metadata?.name || null,
          }).returning();
          dbUserId = newUser.id;
        } else {
          dbUserId = existing[0].id;
        }

        // If there's an explicit next path (e.g. /reset-password), use it
        if (next) {
          return buildRedirect(request, origin, next);
        }

        // Check if user has any church memberships to decide onboarding vs dashboard
        const memberships = await db
          .select()
          .from(churchMemberships)
          .where(eq(churchMemberships.userId, dbUserId))
          .limit(1);

        const redirectTo = memberships.length === 0 ? "/onboarding" : "/dashboard";
        return buildRedirect(request, origin, redirectTo);
      }

      return buildRedirect(request, origin, next || "/dashboard");
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

function buildRedirect(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`);
  } else {
    return NextResponse.redirect(`${origin}${path}`);
  }
}
