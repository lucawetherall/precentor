-- Align services table with Drizzle schema by adding the preset_id column.
-- Nullable, no FK (church_service_presets table not present). Allows
-- db.select().from(services) to succeed.
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "preset_id" uuid;
