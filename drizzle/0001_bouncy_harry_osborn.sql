ALTER TABLE "liturgical_days" ADD COLUMN "lectionary_year" text;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "reading_text" text;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "bible_version" text;
