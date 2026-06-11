/**
 * Escape a user-supplied search term for safe use inside a SQL `LIKE`/`ILIKE`
 * pattern. The query value is already parameterised by Drizzle, so this is not
 * about SQL injection — it's about preventing the LIKE wildcards `%` and `_`
 * (and the escape character `\` itself) in user input from being treated as
 * wildcards. Without this, a search for "100%" would match far more than the
 * literal string.
 *
 * Order matters: backslashes must be escaped first, otherwise the escapes we
 * add for `%` and `_` would themselves get double-escaped.
 */
export function escapeLike(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
