function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy env access — validates at runtime when first accessed, not at import/build time.
// This avoids crashes during `next build` or `vitest` when env vars aren't set.
export const env = new Proxy(
  {} as {
    readonly DATABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    readonly GEMINI_API_KEY: string;
    readonly RESEND_API_KEY: string;
    readonly CRON_SECRET: string;
    readonly NEXT_PUBLIC_APP_URL: string;
    readonly LLM_PROVIDER: string;
  },
  {
    get(_target, prop: string) {
      switch (prop) {
        case "DATABASE_URL":
        case "NEXT_PUBLIC_SUPABASE_URL":
        case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
          return requireEnv(prop);
        case "SUPABASE_SERVICE_ROLE_KEY":
          return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
        case "GEMINI_API_KEY":
          return process.env.GEMINI_API_KEY || "";
        case "RESEND_API_KEY":
          return process.env.RESEND_API_KEY || "";
        case "CRON_SECRET":
          // Required in production so the cron endpoint can't silently accept
          // every request. Optional in dev/test so CI and local runs work.
          if (process.env.NODE_ENV === "production") return requireEnv("CRON_SECRET");
          return process.env.CRON_SECRET || "";
        case "NEXT_PUBLIC_APP_URL":
          return process.env.NEXT_PUBLIC_APP_URL || "https://precentor.app";
        case "LLM_PROVIDER":
          return process.env.LLM_PROVIDER || "gemini";
        default:
          return undefined;
      }
    },
  }
);
