import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import {
  churches,
  hymns,
  musicSlots,
  services,
  serviceTypeEnum,
  musicSlotTypeEnum,
  riteEnum,
} from "./schema";

// ─── Liturgical Texts ────────────────────────────────────────
export const liturgicalTexts = pgTable("liturgical_texts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  rite: riteEnum("rite").notNull(),
  category: text("category").notNull(),
  blocks: jsonb("blocks").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Service Type Templates ───────────────────────────────────
export const serviceTypeTemplates = pgTable("service_type_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceType: serviceTypeEnum("service_type").notNull().unique(),
  rite: text("rite").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Template Sections ────────────────────────────────────────
export const templateSections = pgTable("template_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull().references(() => serviceTypeTemplates.id),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  musicSlotType: musicSlotTypeEnum("music_slot_type"),
  placeholderType: text("placeholder_type"),
  optional: boolean("optional").default(false).notNull(),
  allowOverride: boolean("allow_override").default(false).notNull(),
});

// ─── Church Templates ─────────────────────────────────────────
export const churchTemplates = pgTable("church_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchId: uuid("church_id").notNull().references(() => churches.id, { onDelete: "cascade" }),
  baseTemplateId: uuid("base_template_id").notNull().references(() => serviceTypeTemplates.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("church_template_unique").on(t.churchId, t.baseTemplateId),
]);

// ─── Church Template Sections ─────────────────────────────────
export const churchTemplateSections = pgTable("church_template_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  churchTemplateId: uuid("church_template_id").notNull().references(() => churchTemplates.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  musicSlotType: musicSlotTypeEnum("music_slot_type"),
  placeholderType: text("placeholder_type"),
  optional: boolean("optional").default(false).notNull(),
  allowOverride: boolean("allow_override").default(false).notNull(),
});

// ─── Service Sections ─────────────────────────────────────────
export const serviceSections = pgTable("service_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(),
  title: text("title").notNull(),
  majorSection: text("major_section"),
  positionOrder: integer("position_order").notNull(),
  liturgicalTextId: uuid("liturgical_text_id").references(() => liturgicalTexts.id),
  textOverride: jsonb("text_override"),
  musicSlotId: uuid("music_slot_id").references(() => musicSlots.id, { onDelete: "set null" }),
  placeholderType: text("placeholder_type"),
  placeholderValue: text("placeholder_value"),
  visible: boolean("visible").default(true).notNull(),
});

// ─── Hymn Verses ──────────────────────────────────────────────
export const hymnVerses = pgTable("hymn_verses", {
  id: uuid("id").primaryKey().defaultRandom(),
  hymnId: uuid("hymn_id").notNull().references(() => hymns.id, { onDelete: "cascade" }),
  verseNumber: integer("verse_number").notNull(),
  text: text("text").notNull(),
  isChorus: boolean("is_chorus").default(false).notNull(),
}, (t) => [
  uniqueIndex("hymn_verse_unique").on(t.hymnId, t.verseNumber),
]);
