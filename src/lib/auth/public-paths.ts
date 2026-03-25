/** Paths that do not require authentication. */
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

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
