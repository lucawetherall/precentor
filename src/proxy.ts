import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPublicPath } from "@/lib/auth/public-paths";

// Generate a correlation ID for every request. Forwarded to route handlers via
// the `x-request-id` request header, echoed back in the response header so the
// caller (and support debugging a user-reported issue) can join it against
// server logs. Uses the Web Crypto API so it works in the Edge runtime.
function generateRequestId(): string {
  return crypto.randomUUID();
}

export async function proxy(request: NextRequest) {
  const incoming = request.headers.get("x-request-id");
  const requestId = incoming && incoming.length <= 128 ? incoming : generateRequestId();

  // Forward the ID to downstream handlers via the request headers. This works
  // because updateSession() always calls NextResponse.next({ request }), which
  // propagates the mutated request headers.
  request.headers.set("x-request-id", requestId);

  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (error) {
    console.error("[proxy] Session update failed:", error, { requestId });
    if (isPublicPath(request.nextUrl.pathname)) {
      response = NextResponse.next({ request });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      response = NextResponse.redirect(url);
    }
  }

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
