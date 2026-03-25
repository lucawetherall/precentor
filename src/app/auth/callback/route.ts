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
    console.log("[auth/callback] params:", { code: !!code, tokenHash: !!tokenHash, type, next });
    const supabase = await createClient();
    console.log("[auth/callback] supabase client created");

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
      console.log("[auth/callback] attempting verifyOtp with token_hash");
      const { data: otpData, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "recovery" | "email" | "signup",
      });
      console.log("[auth/callback] verifyOtp result:", { hasSession: !!otpData?.session, hasUser: !!otpData?.user, error: error?.message });
      if (!error) {
        // For recovery flows, redirect to reset-password regardless of next param
        const redirectPath = type === "recovery" ? "/reset-password" : next;
        console.log("[auth/callback] verifyOtp succeeded, redirecting to:", redirectPath);
        return handleAuthenticatedUser(request, supabase, origin, redirectPath);
      }
      console.error("[auth/callback] OTP verification failed:", error.message);
    }
  } catch (e) {
    console.error("[auth/callback] Unexpected error:", e instanceof Error ? { message: e.message, stack: e.stack } : e);
  }

  console.log("[auth/callback] falling through to error redirect");
  return buildRedirect(request, origin, "/login?error=auth");
}

async function handleAuthenticatedUser(
  request: Request,
  supabase: Awaited<ReturnType<typeof createClient>>,
  origin: string,
  next: string | null,
) {
  console.log("[auth/callback] handleAuthenticatedUser called, next:", next);

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();
  console.log("[auth/callback] getUser result:", { hasUser: !!user, userId: user?.id?.slice(0, 8), error: getUserError?.message });

  if (user) {
    // Upsert user record
    console.log("[auth/callback] querying db for user:", user.id.slice(0, 8));
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);
    console.log("[auth/callback] db query result:", { found: existing.length });

    let dbUserId: string;

    if (existing.length === 0) {
      if (!user.email) {
        return buildRedirect(request, origin, "/login?error=auth");
      }
      const [newUser] = await db.insert(users).values({
        email: user.email,
        supabaseId: user.id,
        name: user.user_metadata?.name || null,
      }).returning();
      dbUserId = newUser.id;
    } else {
      dbUserId = existing[0].id;
    }

    // If there's an explicit next path (e.g. /reset-password), use it
    if (next) {
      console.log("[auth/callback] redirecting to next:", next);
      return buildRedirect(request, origin, next);
    }

    // Check if user has any church memberships to decide onboarding vs dashboard
    const memberships = await db
      .select()
      .from(churchMemberships)
      .where(eq(churchMemberships.userId, dbUserId))
      .limit(1);

    const redirectTo = memberships.length === 0 ? "/onboarding" : "/dashboard";
    console.log("[auth/callback] redirecting to:", redirectTo);
    return buildRedirect(request, origin, redirectTo);
  }

  console.log("[auth/callback] no user found after getUser, redirecting to:", next || "/dashboard");
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
