import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, churchMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  // Validate next param to prevent open redirects
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  try {
    const supabase = await createClient();

    // Try PKCE code exchange first (works when same browser context has the verifier cookie)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return handleAuthenticatedUser(request, supabase, origin, next);
      }
      console.error("[auth/callback] Code exchange failed:", error.message);
    }

    // Fallback: token_hash flow for email links opened in a different browser context
    // (e.g. in-app email viewer, different browser) where the PKCE verifier cookie is absent
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "signup",
      });
      if (!error) {
        // For recovery flows, redirect to reset-password regardless of next param
        const redirectPath = type === "recovery" ? "/reset-password" : next;
        return handleAuthenticatedUser(request, supabase, origin, redirectPath);
      }
      console.error("[auth/callback] OTP verification failed:", error.message);
    }
  } catch (e) {
    console.error("[auth/callback] Unexpected error:", e instanceof Error ? e.message : e);
  }

  return buildRedirect(request, origin, "/login?error=auth");
}

async function handleAuthenticatedUser(
  request: Request,
  supabase: Awaited<ReturnType<typeof createClient>>,
  origin: string,
  next: string | null,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Upsert user record — wrapped in try/catch so a DB outage
    // doesn't block the auth redirect (the user already has a valid session).
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, user.id))
        .limit(1);

      let dbUserId: string;

      if (existing.length === 0) {
        if (!user.email) {
          return buildRedirect(request, origin, "/login?error=auth");
        }
        const [newUser] = await db.insert(users).values({
          // Normalise to lowercase so case-different duplicates resolve to the same row.
          // Supabase Auth already treats emails case-insensitively; the DB must agree.
          email: user.email.toLowerCase(),
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
    } catch (dbError) {
      console.error("[auth/callback] DB error during user upsert:", dbError instanceof Error ? dbError.message : dbError);
      // Auth succeeded even though DB is unreachable — honour the explicit
      // redirect (e.g. /reset-password) so the user isn't stranded.
      return buildRedirect(request, origin, next || "/dashboard");
    }
  }

  return buildRedirect(request, origin, next || "/dashboard");
}

function buildRedirect(_request: Request, origin: string, path: string) {
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`);
  }

  // Use explicitly configured app URL to prevent open redirects via x-forwarded-host
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return NextResponse.redirect(`${appUrl}${path}`);
  }

  return NextResponse.redirect(`${origin}${path}`);
}
