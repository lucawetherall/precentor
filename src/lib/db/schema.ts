// ─── Re-exports: single entry point for the full schema ──────
// schema-base.ts contains all core tables and enums.
// schema-liturgy.ts contains liturgy/template tables (imports from schema-base, no circular dep).
// Application code should always import from "@/lib/db/schema".
export * from "./schema-base";
export * from "./schema-liturgy";
