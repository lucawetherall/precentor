import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Daily per-church cap on Gemini calls. 200 suggestions/day covers a large
 * church planning 30 services × 6 slots each in a single day with headroom;
 * it also caps worst-case Gemini spend at a few pence per church per day.
 *
 * Configurable per deploy via AI_DAILY_QUOTA env var for tuning under load.
 */
const DEFAULT_QUOTA = 200;

function quotaFor(): number {
  const configured = Number(process.env.AI_DAILY_QUOTA);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_QUOTA;
}

/**
 * Atomically increment the (church, today) counter and return whether the
 * request is within the quota. The single UPSERT avoids the classic TOCTOU
 * between "check" and "increment" — two concurrent callers can't both squeeze
 * past the limit because the RETURNING count is post-increment.
 *
 * Fails open on DB error: we'd rather serve suggestions than block a church
 * from planning services because our own quota table is unreachable.
 */
export async function consumeAiQuota(churchId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
}> {
  const limit = quotaFor();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC

  try {
    const result = await db.execute<{ count: number }>(sql`
      INSERT INTO ai_usage_daily (church_id, day, count)
      VALUES (${churchId}, ${today}, 1)
      ON CONFLICT (church_id, day)
      DO UPDATE SET count = ai_usage_daily.count + 1
      RETURNING count
    `);
    const used = Number(result[0]?.count ?? 0);
    return { allowed: used <= limit, used, limit };
  } catch {
    // Fail open — quota enforcement is defence in depth, not the primary
    // guard (per-user rate limit already caps burst).
    return { allowed: true, used: 0, limit };
  }
}
