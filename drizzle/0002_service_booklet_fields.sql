-- Service booklet enhancement: add fields for liturgical booklet generation
ALTER TABLE "services" ADD COLUMN "eucharistic_prayer" text;
ALTER TABLE "services" ADD COLUMN "include_reading_text" boolean DEFAULT true NOT NULL;
ALTER TABLE "services" ADD COLUMN "sheet_mode" text DEFAULT 'summary' NOT NULL;
ALTER TABLE "services" ADD COLUMN "liturgical_overrides" jsonb DEFAULT '{}'::jsonb;
