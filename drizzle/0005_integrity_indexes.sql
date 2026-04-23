-- Production-readiness hardening: case-insensitive email uniqueness + missing FK indexes.
-- SAFE TO RE-RUN: every CREATE uses IF NOT EXISTS; the UPDATE is idempotent.
--
-- If a pre-existing pair of users differ only by email case, the CREATE UNIQUE
-- INDEX statement will fail. Run the diagnostic query below first and merge
-- duplicates manually before applying:
--   SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;

-- 1. Normalise existing user emails to lowercase so the functional unique
--    index can be created. Idempotent — lower(lower(x)) = lower(x).
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");
UPDATE "invites" SET "email" = lower("email") WHERE "email" IS NOT NULL AND "email" <> lower("email");

-- 2. Enforce case-insensitive email uniqueness on users.
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique"
  ON "users" (lower("email"));

-- 3. Missing FK indexes identified in the production-readiness audit.
--    Every column below appears in a WHERE / JOIN on the hot path but was
--    missing its own index (parent table had an index; child did not).
CREATE INDEX IF NOT EXISTS "music_slot_hymn_idx"        ON "music_slots" ("hymn_id");
CREATE INDEX IF NOT EXISTS "music_slot_anthem_idx"      ON "music_slots" ("anthem_id");
CREATE INDEX IF NOT EXISTS "music_slot_mass_idx"        ON "music_slots" ("mass_setting_id");
CREATE INDEX IF NOT EXISTS "anthem_church_idx"          ON "anthems" ("church_id");
CREATE INDEX IF NOT EXISTS "collect_church_idx"         ON "collects" ("church_id");
CREATE INDEX IF NOT EXISTS "canticle_setting_church_idx" ON "canticle_settings" ("church_id");
CREATE INDEX IF NOT EXISTS "responses_setting_church_idx" ON "responses_settings" ("church_id");
CREATE INDEX IF NOT EXISTS "invite_church_idx"          ON "invites" ("church_id");
CREATE INDEX IF NOT EXISTS "invite_email_idx"           ON "invites" (lower("email")) WHERE "email" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "service_liturgical_day_idx" ON "services" ("liturgical_day_id");
CREATE INDEX IF NOT EXISTS "service_eucharistic_prayer_idx" ON "services" ("eucharistic_prayer_id");
CREATE INDEX IF NOT EXISTS "service_collect_idx"        ON "services" ("collect_id");
CREATE INDEX IF NOT EXISTS "service_default_mass_idx"   ON "services" ("default_mass_setting_id");
CREATE INDEX IF NOT EXISTS "rota_user_idx"              ON "rota_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "availability_user_idx"      ON "availability" ("user_id");
CREATE INDEX IF NOT EXISTS "perf_log_music_slot_idx"    ON "performance_logs" ("music_slot_id");
CREATE INDEX IF NOT EXISTS "church_mass_setting_idx"    ON "church_mass_settings" ("mass_setting_id");
CREATE INDEX IF NOT EXISTS "church_service_pattern_church_idx" ON "church_service_patterns" ("church_id");
CREATE INDEX IF NOT EXISTS "service_sheet_template_church_idx" ON "service_sheet_templates" ("church_id");

-- 4. Sanity CHECK constraints. All app-level code already respects these,
--    but a bad direct-SQL write (or bug) should be rejected by the DB.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'church_service_pattern_day_of_week_check') THEN
    ALTER TABLE "church_service_patterns"
      ADD CONSTRAINT "church_service_pattern_day_of_week_check"
      CHECK ("day_of_week" BETWEEN 0 AND 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_slot_position_order_check') THEN
    ALTER TABLE "music_slots"
      ADD CONSTRAINT "music_slot_position_order_check"
      CHECK ("position_order" >= 0);
  END IF;
END $$;
