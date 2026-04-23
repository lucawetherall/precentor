import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let _adminClient: ReturnType<typeof createClient> | null = null;

/** Supabase admin client with service role key. Server-side only — never expose to client. */
export function createAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _adminClient;
}
