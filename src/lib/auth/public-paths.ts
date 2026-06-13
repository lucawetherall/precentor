/** Paths that do not require authentication. */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/contact",
  "/about",
  "/faq",
  // Metadata files — crawlers and browsers fetch these without a session.
  // The proxy matcher also excludes them; this keeps the fallback path safe.
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/icon-192.png",
  "/icon-512.png",
];

/** Paths where authenticated users should be redirected away (e.g. to /dashboard). */
export const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

/** Returns true if the given pathname is accessible without authentication. */
export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/api/invites/")
  );
}
