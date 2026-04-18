import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";
import { env } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const client = postgres(env.DATABASE_URL, {
        prepare: false,
        // 10 concurrent connections per serverless instance balances a single
        // handler running ~2 parallel queries (church creation, PDF assembly)
        // against Supabase's default 60-connection project ceiling. Raise only
        // after measuring — higher values starve other instances under load.
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client, { schema: { ...schema, ...relations } });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
