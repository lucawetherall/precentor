import type { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { apiError, ErrorCodes } from "@/lib/api-helpers";

export type ParseResult<T> =
  | { data: T; error: null }
  | { data: null; error: NextResponse };

/**
 * Parse a JSON request body and validate it against a Zod schema in one step.
 *
 * Collapses the four-line "try/catch req.json() then schema.safeParse" pattern
 * into a single call. The caller pattern is:
 *
 * ```ts
 * const { data, error } = await parseJsonBody(req, mySchema);
 * if (error) return error;
 * // `data` is fully typed
 * ```
 *
 * Returns a 400 `NextResponse` with `INVALID_INPUT` code for both malformed
 * JSON and schema-validation failures. The error message is "Invalid JSON" for
 * parse errors and the first Zod issue message for validation failures, so
 * clients see actionable detail without a stack trace.
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return {
      data: null,
      error: apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT }),
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid request body";
    return {
      data: null,
      error: apiError(message, 400, { code: ErrorCodes.INVALID_INPUT }),
    };
  }

  return { data: result.data, error: null };
}
