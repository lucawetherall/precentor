import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, date, json, uniqueIndex, index } from "drizzle-orm/pg-core";

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
  "OLD_TESTAMENT", "PSALM", "EPISTLE", "GOSPEL", "CANTICLE",
]);
export const serviceTypeEnum = pgEnum("service_type", [
  "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST", "CHORAL_MATINS",
  "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
]);
export const serviceStatusEnum = pgEnum("service_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const musicSlotTypeEnum = pgEnum("music_slot_type", [
  "HYMN", "PSALM", "ANTHEM", "MASS_SETTING_GLORIA", "MASS_SETTING_SANCTUS",
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
  includeReadingText: boolean("include_reading_text").default(true).notNull(),
  sheetMode: text("sheet_mode").default("summary").notNull(),
  liturgicalOverrides: json("liturgical_overrides").default({}).$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("service_unique").on(t.churchId, t.liturgicalDayId, t.serviceType),
  index("service_church_idx").on(t.churchId),
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
  email: text("email").notNull(),
  role: memberRoleEnum("role").default("MEMBER").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Rota & Availability ─────────────────────────────────────
export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  status: availabilityStatusEnum("status").notNull(),
}, (t) => [
  uniqueIndex("availability_unique").on(t.userId, t.serviceId),
]);

export const rotaEntries = pgTable("rota_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  confirmed: boolean("confirmed").default(false).notNull(),
}, (t) => [
  uniqueIndex("rota_unique").on(t.serviceId, t.userId),
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
});

// ─── Service Sheet Templates ──────────────────────────────────
export const serviceSheetTemplates = pgTable("service_sheet_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  format: text("format").default("A4").notNull(),
  layout: json("layout").default({}).$type<Record<string, unknown>>(),
  logoUrl: text("logo_url"),
});
