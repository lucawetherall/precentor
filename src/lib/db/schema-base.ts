import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, date, json, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────
export const memberRoleEnum = pgEnum("member_role", ["ADMIN", "EDITOR", "MEMBER"]);
export const voicePartEnum = pgEnum("voice_part", ["SOPRANO", "ALTO", "TENOR", "BASS"]);
export const liturgicalSeasonEnum = pgEnum("liturgical_season", [
  "ADVENT", "CHRISTMAS", "EPIPHANY", "LENT", "HOLY_WEEK", "EASTER",
  "ASCENSION", "PENTECOST", "TRINITY", "ORDINARY", "KINGDOM",
]);
export const liturgicalColourEnum = pgEnum("liturgical_colour", [
  "PURPLE", "WHITE", "GOLD", "GREEN", "RED", "ROSE",
]);
export const lectionaryEnum = pgEnum("lectionary", ["PRINCIPAL", "SECOND", "THIRD"]);
export const readingPositionEnum = pgEnum("reading_position", [
  "OLD_TESTAMENT", "PSALM", "NEW_TESTAMENT", "GOSPEL", "CANTICLE",
]);
export const serviceTypeEnum = pgEnum("service_type", [
  "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST", "CHORAL_MATINS",
  "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
]);
export const serviceStatusEnum = pgEnum("service_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const musicSlotTypeEnum = pgEnum("music_slot_type", [
  "HYMN", "PSALM", "ANTHEM", "MASS_SETTING_KYRIE", "MASS_SETTING_GLORIA", "MASS_SETTING_SANCTUS",
  "MASS_SETTING_AGNUS", "MASS_SETTING_GLOBAL", "ORGAN_VOLUNTARY_PRE",
  "ORGAN_VOLUNTARY_POST", "ORGAN_VOLUNTARY_OFFERTORY", "CANTICLE_MAGNIFICAT",
  "CANTICLE_NUNC_DIMITTIS", "RESPONSES", "GOSPEL_ACCLAMATION", "OTHER",
]);
export const hymnBookEnum = pgEnum("hymn_book", ["NEH", "AM"]);
export const canticleTypeEnum = pgEnum("canticle_type", [
  "MAGNIFICAT", "NUNC_DIMITTIS", "TE_DEUM", "JUBILATE", "VENITE",
  "BENEDICTUS_SONG_OF_ZECHARIAH",
]);
export const availabilityStatusEnum = pgEnum("availability_status", [
  "AVAILABLE", "UNAVAILABLE", "TENTATIVE",
]);
export const choirStatusEnum = pgEnum("choir_status", [
  "CHOIR_REQUIRED",
  "NO_CHOIR_NEEDED",
  "SAID_SERVICE_ONLY",
  "NO_SERVICE",
]);

// ─── Users & Churches ────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  supabaseId: text("supabase_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const churches = pgTable("churches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  diocese: text("diocese"),
  ccliNumber: text("ccli_number"),
  settings: json("settings").default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const churchMemberships = pgTable("church_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").default("MEMBER").notNull(),
  voicePart: voicePartEnum("voice_part"),
  permissions: json("permissions").default({}).$type<Record<string, boolean>>(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("membership_unique").on(t.userId, t.churchId),
  index("membership_user_idx").on(t.userId),
  index("membership_church_role_idx").on(t.churchId, t.role),
]);

// ─── Liturgical Calendar ─────────────────────────────────────
export const liturgicalDays = pgTable("liturgical_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull().unique(),
  season: liturgicalSeasonEnum("season").notNull(),
  colour: liturgicalColourEnum("colour").notNull(),
  cwName: text("cw_name").notNull(),
  transferredFrom: text("transferred_from"),
  icalUid: text("ical_uid").unique(), // Repurposed: stores the sundayKey from lectionary JSON
  rawDescription: text("raw_description"),
  collect: text("collect"),
  postCommunion: text("post_communion"),
  lectionaryYear: text("lectionary_year"), // "A", "B", or "C"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const readings = pgTable("readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  liturgicalDayId: uuid("liturgical_day_id").notNull().references(() => liturgicalDays.id, { onDelete: "cascade" }),
  lectionary: lectionaryEnum("lectionary").notNull(),
  position: readingPositionEnum("position").notNull(),
  reference: text("reference").notNull(),
  bookName: text("book_name"),
  readingText: text("reading_text"), // Actual scripture text from Oremus Bible API
  bibleVersion: text("bible_version"), // e.g., "NRSVAE"
}, (t) => [
  index("reading_liturgical_day_idx").on(t.liturgicalDayId),
]);

// ─── Liturgy Core ─────────────────────────────────────────────
export const riteEnum = pgEnum("rite", ["CW", "BCP", "COMMON", "CUSTOM"]);

export const eucharisticPrayers = pgTable("eucharistic_prayers", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  rite: riteEnum("rite").notNull(),
  description: text("description").notNull(),
  blocks: jsonb("blocks").notNull().$type<{ speaker: string; text: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collects = pgTable("collects", {
  id: uuid("id").primaryKey().defaultRandom(),
  liturgicalDayId: uuid("liturgical_day_id").references(() => liturgicalDays.id),
  rite: riteEnum("rite").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  churchId: uuid("church_id").references(() => churches.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("collect_liturgical_day_idx").on(t.liturgicalDayId),
  uniqueIndex("collect_unique").on(t.liturgicalDayId, t.rite, t.churchId),
]);

// ─── Services & Music Planning ───────────────────────────────
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  liturgicalDayId: uuid("liturgical_day_id").notNull().references(() => liturgicalDays.id, { onDelete: "cascade" }),
  serviceType: serviceTypeEnum("service_type").notNull(),
  time: text("time"),
  status: serviceStatusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  eucharisticPrayer: text("eucharistic_prayer"),
  eucharisticPrayerId: uuid("eucharistic_prayer_id").references(() => eucharisticPrayers.id),
  collectId: uuid("collect_id").references(() => collects.id),
  collectOverride: text("collect_override"),
  includeReadingText: boolean("include_reading_text").default(true).notNull(),
  sheetMode: text("sheet_mode").default("summary").notNull(),
  liturgicalOverrides: json("liturgical_overrides").default({}).$type<Record<string, string>>(),
  choirStatus: choirStatusEnum("choir_status").default("CHOIR_REQUIRED").notNull(),
  defaultMassSettingId: uuid("default_mass_setting_id").references(() => massSettings.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("service_unique").on(t.churchId, t.liturgicalDayId, t.serviceType),
  index("service_church_idx").on(t.churchId),
  index("service_church_status_idx").on(t.churchId, t.status),
]);

export const musicSlots = pgTable("music_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  slotType: musicSlotTypeEnum("slot_type").notNull(),
  positionOrder: integer("position_order").notNull(),
  hymnId: uuid("hymn_id").references(() => hymns.id),
  anthemId: uuid("anthem_id").references(() => anthems.id),
  massSettingId: uuid("mass_setting_id").references(() => massSettings.id),
  canticleSettingId: uuid("canticle_setting_id").references(() => canticleSettings.id),
  responsesSettingId: uuid("responses_setting_id").references(() => responsesSettings.id),
  freeText: text("free_text"),
  notes: text("notes"),
  verseCount: integer("verse_count"),
  selectedVerses: integer("selected_verses").array(),
}, (t) => [
  index("music_slot_service_idx").on(t.serviceId),
]);

// ─── Music Databases ─────────────────────────────────────────
export const hymns = pgTable("hymns", {
  id: uuid("id").primaryKey().defaultRandom(),
  book: hymnBookEnum("book").notNull(),
  number: integer("number").notNull(),
  firstLine: text("first_line").notNull(),
  tuneName: text("tune_name"),
  metre: text("metre"),
  author: text("author"),
  composer: text("composer"),
  seasonTags: text("season_tags").array().default([]),
  themeTags: text("theme_tags").array().default([]),
}, (t) => [
  uniqueIndex("hymn_book_number").on(t.book, t.number),
  index("hymn_first_line_idx").on(t.firstLine),
]);

export const anthems = pgTable("anthems", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  title: text("title").notNull(),
  composer: text("composer").notNull(),
  arranger: text("arranger"),
  voicing: text("voicing"),
  accompaniment: text("accompaniment"),
  duration: integer("duration"),
  difficulty: integer("difficulty"),
  seasonTags: text("season_tags").array().default([]),
  scriptureTags: text("scripture_tags").array().default([]),
  source: text("source"),
  notes: text("notes"),
}, (t) => [
  index("anthem_title_idx").on(t.title),
  index("anthem_composer_idx").on(t.composer),
]);

export const massSettings = pgTable("mass_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  composer: text("composer").notNull(),
  voicing: text("voicing"),
  movements: text("movements").array().default([]),
  source: text("source"),
});

export const churchMassSettings = pgTable("church_mass_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  massSettingId: uuid("mass_setting_id").notNull().references(() => massSettings.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("church_mass_unique").on(t.churchId, t.massSettingId),
]);

export const canticleSettings = pgTable("canticle_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  canticle: canticleTypeEnum("canticle").notNull(),
  composer: text("composer").notNull(),
  name: text("name"),
  key: text("key"),
  voicing: text("voicing"),
  source: text("source"),
});

export const responsesSettings = pgTable("responses_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").references(() => churches.id),
  name: text("name").notNull(),
  composer: text("composer").notNull(),
});

// ─── Invites ─────────────────────────────────────────────────
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  email: text("email"),
  role: memberRoleEnum("role").default("MEMBER").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  // Last error string from the transactional email send, if any. Admins can
  // surface "email didn't send — resend?" in the UI without needing to grep
  // server logs. Null = email never attempted (open invite) or sent OK.
  lastSendError: text("last_send_error"),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("invite_church_idx").on(t.churchId),
  index("invite_email_idx").on(t.email),
]);

// ─── Rota & Availability ─────────────────────────────────────
export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  status: availabilityStatusEnum("status").notNull(),
}, (t) => [
  uniqueIndex("availability_unique").on(t.userId, t.serviceId),
  index("availability_service_idx").on(t.serviceId),
]);

export const rotaEntries = pgTable("rota_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  confirmed: boolean("confirmed").default(false).notNull(),
}, (t) => [
  uniqueIndex("rota_unique").on(t.serviceId, t.userId),
  index("rota_service_idx").on(t.serviceId),
]);

// ─── Performance Log ─────────────────────────────────────────
export const performanceLogs = pgTable("performance_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  musicSlotId: uuid("music_slot_id").notNull().references(() => musicSlots.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  hymnId: uuid("hymn_id"),
  anthemId: uuid("anthem_id"),
  freeText: text("free_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("perf_log_church_idx").on(t.churchId),
  index("perf_log_date_idx").on(t.date),
]);

// ─── Service Sheet Templates ──────────────────────────────────
export const serviceSheetTemplates = pgTable("service_sheet_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").default("A4").notNull(),
  layout: json("layout").default({}).$type<Record<string, unknown>>(),
  logoUrl: text("logo_url"),
});

// ─── Church Service Patterns ──────────────────────────────────
export const churchServicePatterns = pgTable("church_service_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),  // 0=Sun, 6=Sat
  serviceType: serviceTypeEnum("service_type").notNull(),
  time: text("time"),  // e.g. "10:00"
  enabled: boolean("enabled").default(true).notNull(),
}, (t) => [
  uniqueIndex("church_service_pattern_unique").on(t.churchId, t.dayOfWeek, t.serviceType),
]);

// ─── Operational: AI usage quota ─────────────────────────────
// One row per (churchId, date). Counter is incremented atomically on every
// Gemini suggestion call. A daily cap stops a compromised or abusive account
// from running up unlimited spend.
export const aiUsageDaily = pgTable("ai_usage_daily", {
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  count: integer("count").default(0).notNull(),
}, (t) => [
  uniqueIndex("ai_usage_daily_pk").on(t.churchId, t.day),
]);

// ─── Operational: User deletion audit ────────────────────────
// Written immediately before a hard-delete so we retain an auditable record
// of who had access to what, without retaining PII beyond necessity.
// Redacted of email/name — we keep only structural metadata.
export const userDeletions = pgTable("user_deletions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The user's UUID at delete-time. Not an FK — the user row is gone after delete.
  deletedUserId: uuid("deleted_user_id").notNull(),
  churchIds: uuid("church_ids").array().notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  reason: text("reason"),
});

// ─── Operational: Rate limit buckets ─────────────────────────
// Durable counterpart of lib/rate-limit.ts. Serverless environments spin up
// many instances — an in-memory Map gives each instance its own limit, which
// collapses the effective rate limit to (limit × instanceCount). A single row
// per (key, window_start) gives us a shared counter with millisecond
// granularity that costs one UPSERT per request.
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").notNull(),
  // Start of the current window (millisecond epoch). Old rows are swept
  // periodically by the cleanup job — see /api/cron/sweep-rate-limits.
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (t) => [
  uniqueIndex("rate_limit_bucket_pk").on(t.key, t.windowStart),
  index("rate_limit_expires_idx").on(t.expiresAt),
]);
