import "server-only";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

// ─── In-memory fallback ──────────────────────────────────────
// Used for unit tests and as a last-resort fallback if the DB is unreachable.
// Not safe on serverless (each instance has its own Map) — always prefer the
// DB-backed path on production code paths.
interface RateLimitEntry {
  timestamps: number[];
}
const memoryStore = new Map<string, RateLimitEntry>();
let lastMemoryCleanup = Date.now();
const MEMORY_CLEANUP_INTERVAL_MS = 60_000;

function memoryCleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastMemoryCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastMemoryCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of memoryStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) memoryStore.delete(key);
  }
}

function checkInMemory(key: string, opts: RateLimitOptions): boolean {
  memoryCleanup(opts.windowMs);
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length >= opts.maxRequests) return false;
  entry.timestamps.push(now);
  return true;
}

// ─── DB-backed fixed-window limiter ───────────────────────────
// Trades a small precision loss (fixed windows can allow up to 2× burst at
// window boundaries) for a single atomic UPSERT per request. Adequate for
// abuse prevention and far better than the old per-instance memory map.
async function checkInDb(key: string, opts: RateLimitOptions): Promise<boolean> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / opts.windowMs) * opts.windowMs;
  const expiresMs = windowStartMs + opts.windowMs * 2; // keep one extra window for safety

  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(expiresMs);

  // Atomic: insert-or-increment, returning the new count.
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_buckets (key, window_start, count, expires_at)
    VALUES (${key}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count
  `);

  // Opportunistic GC: 1% of requests purge expired rows. Cheap, bounded, and
  // removes the need for a dedicated cron.
  if (Math.random() < 0.01) {
    await db.execute(sql`DELETE FROM rate_limit_buckets WHERE expires_at < now()`).catch(() => {});
  }

  const count = Number(result[0]?.count ?? 0);
  return count <= opts.maxRequests;
}

const BACKEND = process.env.RATE_LIMIT_BACKEND === "memory" ? "memory" : "db";
const TEST = typeof process !== "undefined" && process.env.NODE_ENV === "test";

/**
 * Sliding / fixed-window rate limiter. Returns null if the request is allowed,
 * or a 429 Response if rate-limited.
 *
 * DB-backed by default so limits are shared across serverless instances. The
 * memory fallback is used for tests and if the DB check throws, because a
 * rate-limit outage must not take down the request path.
 *
 * Always async — callers must `await` the result.
 */
export async function rateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<NextResponse | null> {
  if (TEST || BACKEND === "memory") {
    return checkInMemory(key, opts) ? null : tooManyRequests(opts);
  }

  try {
    const allowed = await checkInDb(key, opts);
    return allowed ? null : tooManyRequests(opts);
  } catch (err) {
    // Fail open to avoid taking down the app when the DB limiter misbehaves.
    // Log so we notice in alerting rather than silently degrading.
    logger.error("rate-limit db backend failed — falling open", err, { key });
    return checkInMemory(key, opts) ? null : tooManyRequests(opts);
  }
}

function tooManyRequests(opts: RateLimitOptions): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(opts.windowMs / 1000)),
      },
    },
  );
}
