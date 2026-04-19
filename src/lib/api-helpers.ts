import { NextResponse } from "next/server";

/**
 * Shared API response shape.
 *
 * Error payload: `{ error: string, code?: string, details?: unknown }`.
 * `code` is a stable machine-readable identifier (UPPER_SNAKE) that clients
 * can switch on. `details` carries context like validation errors without
 * leaking implementation details.
 */
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_INPUT: "INVALID_INPUT",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  INTERNAL: "INTERNAL",
  UPSTREAM: "UPSTREAM",
  // Role-slots model error codes:
  ROLE_NOT_ROTA_ELIGIBLE: "ROLE_NOT_ROTA_ELIGIBLE",
  VOICE_PART_CANNOT_BE_EXCLUSIVE: "VOICE_PART_CANNOT_BE_EXCLUSIVE",
  USER_LACKS_ROLE: "USER_LACKS_ROLE",
  SLOT_NOT_ON_SERVICE: "SLOT_NOT_ON_SERVICE",
  SLOT_ALREADY_FILLED: "SLOT_ALREADY_FILLED",
  SLOT_AT_CAPACITY: "SLOT_AT_CAPACITY",
  NO_ELIGIBLE_ROLE: "NO_ELIGIBLE_ROLE",
  DUAL_ROLE: "DUAL_ROLE",
  INVALID_SLOT_CARDINALITY: "INVALID_SLOT_CARDINALITY",
  // Migration codes used in audit log + banners:
  MEMBER_NO_VOICE_PART: "MEMBER_NO_VOICE_PART",
  PRESET_TIME_AMBIGUOUS: "PRESET_TIME_AMBIGUOUS",
  ROTA_ENTRY_UNCLASSIFIED: "ROTA_ENTRY_UNCLASSIFIED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ErrorInit {
  code?: ErrorCode;
  details?: unknown;
  headers?: HeadersInit;
}

export function apiError(message: string, status: number, init: ErrorInit = {}) {
  return NextResponse.json(
    {
      error: message,
      code: init.code ?? inferCode(status),
      ...(init.details !== undefined ? { details: init.details } : {}),
    },
    { status, headers: init.headers },
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

function inferCode(status: number): ErrorCode {
  if (status === 401) return ErrorCodes.UNAUTHORIZED;
  if (status === 403) return ErrorCodes.FORBIDDEN;
  if (status === 404) return ErrorCodes.NOT_FOUND;
  if (status === 409) return ErrorCodes.CONFLICT;
  if (status === 422 || status === 400) return ErrorCodes.INVALID_INPUT;
  if (status === 429) return ErrorCodes.RATE_LIMITED;
  if (status === 502 || status === 503 || status === 504) return ErrorCodes.UPSTREAM;
  return ErrorCodes.INTERNAL;
}
