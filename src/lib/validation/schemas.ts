import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();

export const serviceUpdateSchema = z.object({
  serviceType: z.enum([
    "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST",
    "CHORAL_MATINS", "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
  ]).optional(),
  time: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  notes: z.string().nullable().optional(),
  eucharisticPrayer: z.string().nullable().optional(),
  eucharisticPrayerId: z.string().uuid().nullable().optional(),
  collectId: z.string().uuid().nullable().optional(),
  collectOverride: z.string().nullable().optional(),
  includeReadingText: z.boolean().optional(),
  sheetMode: z.string().optional(),
  choirStatus: z.enum([
    "CHOIR_REQUIRED", "NO_CHOIR_NEEDED", "SAID_SERVICE_ONLY", "NO_SERVICE",
  ]).optional(),
  defaultMassSettingId: z.string().uuid().nullable().optional(),
  liturgicalOverrides: z.record(z.string(), z.string()).optional(),
}).strict();

export const sectionCreateSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  majorSection: z.string().nullable().optional(),
  positionOrder: z.number().int().positive(),
  liturgicalTextId: z.string().uuid().nullable().optional(),
  textOverride: z.array(z.object({ speaker: z.string(), text: z.string() })).nullable().optional(),
  musicSlotId: z.string().uuid().nullable().optional(),
  musicSlotType: z.string().nullable().optional(),
  placeholderType: z.string().nullable().optional(),
  placeholderValue: z.string().nullable().optional(),
  visible: z.boolean().optional(),
});

export const memberInviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).default("MEMBER"),
  sendEmail: z.boolean().default(true),
});

export const churchUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  diocese: z.string().max(200).nullable().optional(),
  ccliNumber: z.string().max(50).nullable().optional(),
}).strict();
