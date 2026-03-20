CREATE TYPE "public"."availability_status" AS ENUM('AVAILABLE', 'UNAVAILABLE', 'TENTATIVE');--> statement-breakpoint
CREATE TYPE "public"."canticle_type" AS ENUM('MAGNIFICAT', 'NUNC_DIMITTIS', 'TE_DEUM', 'JUBILATE', 'VENITE', 'BENEDICTUS_SONG_OF_ZECHARIAH');--> statement-breakpoint
CREATE TYPE "public"."hymn_book" AS ENUM('NEH', 'AM');--> statement-breakpoint
CREATE TYPE "public"."lectionary" AS ENUM('PRINCIPAL', 'SECOND', 'THIRD');--> statement-breakpoint
CREATE TYPE "public"."liturgical_colour" AS ENUM('PURPLE', 'WHITE', 'GOLD', 'GREEN', 'RED', 'ROSE');--> statement-breakpoint
CREATE TYPE "public"."liturgical_season" AS ENUM('ADVENT', 'CHRISTMAS', 'EPIPHANY', 'LENT', 'HOLY_WEEK', 'EASTER', 'ASCENSION', 'PENTECOST', 'TRINITY', 'ORDINARY', 'KINGDOM');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('ADMIN', 'EDITOR', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."music_slot_type" AS ENUM('HYMN', 'PSALM', 'ANTHEM', 'MASS_SETTING_GLORIA', 'MASS_SETTING_SANCTUS', 'MASS_SETTING_AGNUS', 'MASS_SETTING_GLOBAL', 'ORGAN_VOLUNTARY_PRE', 'ORGAN_VOLUNTARY_POST', 'ORGAN_VOLUNTARY_OFFERTORY', 'CANTICLE_MAGNIFICAT', 'CANTICLE_NUNC_DIMITTIS', 'RESPONSES', 'GOSPEL_ACCLAMATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."reading_position" AS ENUM('OLD_TESTAMENT', 'PSALM', 'EPISTLE', 'GOSPEL', 'CANTICLE');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('SUNG_EUCHARIST', 'CHORAL_EVENSONG', 'SAID_EUCHARIST', 'CHORAL_MATINS', 'FAMILY_SERVICE', 'COMPLINE', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."voice_part" AS ENUM('SOPRANO', 'ALTO', 'TENOR', 'BASS');--> statement-breakpoint
CREATE TABLE "anthems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid,
	"title" text NOT NULL,
	"composer" text NOT NULL,
	"arranger" text,
	"voicing" text,
	"accompaniment" text,
	"duration" integer,
	"difficulty" integer,
	"season_tags" text[] DEFAULT '{}',
	"scripture_tags" text[] DEFAULT '{}',
	"source" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"status" "availability_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canticle_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid,
	"canticle" "canticle_type" NOT NULL,
	"composer" text NOT NULL,
	"name" text,
	"key" text,
	"voicing" text,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "church_mass_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"mass_setting_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "church_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"church_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'MEMBER' NOT NULL,
	"voice_part" "voice_part",
	"permissions" json DEFAULT '{}'::json,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "churches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"diocese" text,
	"ccli_number" text,
	"settings" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "churches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hymns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book" "hymn_book" NOT NULL,
	"number" integer NOT NULL,
	"first_line" text NOT NULL,
	"tune_name" text,
	"metre" text,
	"author" text,
	"composer" text,
	"season_tags" text[] DEFAULT '{}',
	"theme_tags" text[] DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "liturgical_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"season" "liturgical_season" NOT NULL,
	"colour" "liturgical_colour" NOT NULL,
	"cw_name" text NOT NULL,
	"transferred_from" text,
	"ical_uid" text,
	"raw_description" text,
	"collect" text,
	"post_communion" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "liturgical_days_date_unique" UNIQUE("date"),
	CONSTRAINT "liturgical_days_ical_uid_unique" UNIQUE("ical_uid")
);
--> statement-breakpoint
CREATE TABLE "mass_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"composer" text NOT NULL,
	"voicing" text,
	"movements" text[] DEFAULT '{}',
	"source" text
);
--> statement-breakpoint
CREATE TABLE "music_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"slot_type" "music_slot_type" NOT NULL,
	"position_order" integer NOT NULL,
	"hymn_id" uuid,
	"anthem_id" uuid,
	"mass_setting_id" uuid,
	"canticle_setting_id" uuid,
	"responses_setting_id" uuid,
	"free_text" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "performance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"music_slot_id" uuid NOT NULL,
	"date" date NOT NULL,
	"hymn_id" uuid,
	"anthem_id" uuid,
	"free_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liturgical_day_id" uuid NOT NULL,
	"lectionary" "lectionary" NOT NULL,
	"position" "reading_position" NOT NULL,
	"reference" text NOT NULL,
	"book_name" text
);
--> statement-breakpoint
CREATE TABLE "responses_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid,
	"name" text NOT NULL,
	"composer" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rota_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_sheet_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"name" text NOT NULL,
	"format" text DEFAULT 'A4' NOT NULL,
	"layout" json DEFAULT '{}'::json,
	"logo_url" text
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"liturgical_day_id" uuid NOT NULL,
	"service_type" "service_type" NOT NULL,
	"time" text,
	"status" "service_status" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"supabase_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_supabase_id_unique" UNIQUE("supabase_id")
);
--> statement-breakpoint
ALTER TABLE "anthems" ADD CONSTRAINT "anthems_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canticle_settings" ADD CONSTRAINT "canticle_settings_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_mass_settings" ADD CONSTRAINT "church_mass_settings_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_mass_settings" ADD CONSTRAINT "church_mass_settings_mass_setting_id_mass_settings_id_fk" FOREIGN KEY ("mass_setting_id") REFERENCES "public"."mass_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_hymn_id_hymns_id_fk" FOREIGN KEY ("hymn_id") REFERENCES "public"."hymns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_anthem_id_anthems_id_fk" FOREIGN KEY ("anthem_id") REFERENCES "public"."anthems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_mass_setting_id_mass_settings_id_fk" FOREIGN KEY ("mass_setting_id") REFERENCES "public"."mass_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_canticle_setting_id_canticle_settings_id_fk" FOREIGN KEY ("canticle_setting_id") REFERENCES "public"."canticle_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_slots" ADD CONSTRAINT "music_slots_responses_setting_id_responses_settings_id_fk" FOREIGN KEY ("responses_setting_id") REFERENCES "public"."responses_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_logs" ADD CONSTRAINT "performance_logs_music_slot_id_music_slots_id_fk" FOREIGN KEY ("music_slot_id") REFERENCES "public"."music_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_liturgical_day_id_liturgical_days_id_fk" FOREIGN KEY ("liturgical_day_id") REFERENCES "public"."liturgical_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses_settings" ADD CONSTRAINT "responses_settings_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_entries" ADD CONSTRAINT "rota_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rota_entries" ADD CONSTRAINT "rota_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_sheet_templates" ADD CONSTRAINT "service_sheet_templates_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_liturgical_day_id_liturgical_days_id_fk" FOREIGN KEY ("liturgical_day_id") REFERENCES "public"."liturgical_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anthem_title_idx" ON "anthems" USING btree ("title");--> statement-breakpoint
CREATE INDEX "anthem_composer_idx" ON "anthems" USING btree ("composer");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_unique" ON "availability" USING btree ("user_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "church_mass_unique" ON "church_mass_settings" USING btree ("church_id","mass_setting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_unique" ON "church_memberships" USING btree ("user_id","church_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hymn_book_number" ON "hymns" USING btree ("book","number");--> statement-breakpoint
CREATE INDEX "hymn_first_line_idx" ON "hymns" USING btree ("first_line");--> statement-breakpoint
CREATE UNIQUE INDEX "rota_unique" ON "rota_entries" USING btree ("service_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_unique" ON "services" USING btree ("church_id","liturgical_day_id","service_type");