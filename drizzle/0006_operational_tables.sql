-- Operational tables needed for production hardening.
-- SAFE TO RE-RUN: every statement uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- 1. Invite send-failure tracking. Admins can now surface "email failed to
--    send — resend?" without grepping server logs.
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "last_send_error" text;
ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "email_sent_at" timestamp;

-- 2. AI usage quota — one row per (church, day). Checked + incremented
--    atomically on every Gemini call so a compromised token can't burn
--    unbounded Gemini spend.
CREATE TABLE IF NOT EXISTS "ai_usage_daily" (
  "church_id" uuid NOT NULL REFERENCES "churches"("id") ON DELETE CASCADE,
  "day" date NOT NULL,
  "count" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_daily_pk"
  ON "ai_usage_daily" ("church_id", "day");

-- 3. User-deletion audit. Written inside the same transaction as the user
--    row delete so we retain a structural trail after the cascade fires.
--    Intentionally does NOT retain email / name — just the structural
--    metadata needed to reason about blast radius.
CREATE TABLE IF NOT EXISTS "user_deletions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deleted_user_id" uuid NOT NULL,
  "church_ids" uuid[] NOT NULL,
  "deleted_at" timestamp DEFAULT now() NOT NULL,
  "reason" text
);

-- 4. Durable rate-limit buckets. Replaces the in-memory Map used by
--    lib/rate-limit.ts. Serverless invocations don't share memory, so the
--    old limiter was effectively (limit × instance_count). This table gives
--    a shared counter per (key, window_start).
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" text NOT NULL,
  "window_start" timestamp NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_bucket_pk"
  ON "rate_limit_buckets" ("key", "window_start");

CREATE INDEX IF NOT EXISTS "rate_limit_expires_idx"
  ON "rate_limit_buckets" ("expires_at");
