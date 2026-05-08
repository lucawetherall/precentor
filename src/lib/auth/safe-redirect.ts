/**
 * Validate a redirect-target path against open-redirect attacks.
 *
 * Returns `input` only if it is a same-origin absolute path. Anything else —
 * a missing value, an empty string, a protocol-relative URL (`//evil.com`), a
 * backslash-prefixed URL that some browsers normalise (`/\evil.com`), an
 * absolute URL with scheme, or a relative path without a leading slash — is
 * rejected and the caller's `fallback` is returned instead.
 *
 * @param input    Value typically read from a `?redirect=` query param.
 * @param fallback Path to return when `input` is not a safe same-origin path.
 *                 Defaults to `/dashboard`.
 */
export function safeRedirectPath(
  input: string | null | undefined,
  fallback: string = "/dashboard",
): string {
  if (!input) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//")) return fallback;
  if (input.startsWith("/\\")) return fallback;
  return input;
}
