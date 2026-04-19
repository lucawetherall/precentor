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
  notes: z.string().max(5000).nullable().optional(),
  eucharisticPrayer: z.string().max(500).nullable().optional(),
  eucharisticPrayerId: z.string().uuid().nullable().optional(),
  collectId: z.string().uuid().nullable().optional(),
  collectOverride: z.string().max(2000).nullable().optional(),
  includeReadingText: z.boolean().optional(),
  sheetMode: z.string().max(50).optional(),
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

export const quickInviteSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).default("MEMBER"),
});

export const churchUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  diocese: z.string().max(200).nullable().optional(),
  ccliNumber: z.string().max(50).nullable().optional(),
}).strict();

/** Top-20 most commonly used passwords (NCSC/HIBP deny list guidance). Blocked per ICO guidance. */
const COMMON_PASSWORDS = new Set([
  "password1!", "password12", "password123", "Password1!", "Password12",
  "iloveyou12", "sunshine12", "princess12", "qwerty12345", "welcome123",
  "letmein123", "monkey1234", "dragon1234", "passw0rd12", "football12",
  "1234567890", "0123456789", "9876543210", "1111111111", "1234512345",
]);

// Count the number of character classes (lower, upper, digit, symbol) present.
function characterClassCount(value: string): number {
  let count = 0;
  if (/[a-z]/.test(value)) count++;
  if (/[A-Z]/.test(value)) count++;
  if (/[0-9]/.test(value)) count++;
  if (/[^a-zA-Z0-9]/.test(value)) count++;
  return count;
}

// Reject passwords that are a single character repeated (e.g. "aaaaaaaaaa")
// or a simple run of the same numeric/letter pattern.
function isTriviallyPatterned(value: string): boolean {
  if (/^(.)\1+$/.test(value)) return true;
  // Four or more consecutive same chars anywhere.
  if (/(.)\1{3,}/.test(value)) return true;
  return false;
}

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be 128 characters or fewer")
  .refine(
    (val) => !COMMON_PASSWORDS.has(val),
    "This password is too common. Please choose a more unique password.",
  )
  .refine(
    (val) => characterClassCount(val) >= 3,
    "Password must include at least three of: lowercase, uppercase, digit, symbol.",
  )
  .refine(
    (val) => !isTriviallyPatterned(val),
    "Password must not repeat the same character four or more times in a row.",
  );

export const memberRoleAssignmentSchema = z.object({
  catalogRoleId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
}).strict();

export const memberRoleUpdateSchema = z.object({
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();

export const presetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  serviceType: z.enum(["SUNG_EUCHARIST","CHORAL_EVENSONG","SAID_EUCHARIST","CHORAL_MATINS","FAMILY_SERVICE","COMPLINE","CUSTOM"]),
  defaultTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  choirRequirement: z.enum(["FULL_CHOIR","ORGANIST_ONLY","SAID"]),
  musicListFieldSet: z.enum(["CHORAL","HYMNS_ONLY","READINGS_ONLY"]),
  liturgicalTemplateId: z.string().uuid().nullable().optional(),
  liturgicalSeasonTags: z.array(z.enum([
    "ADVENT","CHRISTMAS","EPIPHANY","LENT","HOLY_WEEK","EASTER",
    "ASCENSION","PENTECOST","TRINITY","ORDINARY","KINGDOM",
  ])).optional(),
}).strict();

export const presetUpdateSchema = presetCreateSchema.partial().strict();

export const presetSlotCreateSchema = z.object({
  catalogRoleId: z.string().uuid(),
  minCount: z.number().int().min(0),
  maxCount: z.number().int().min(1).nullable().optional(),
  exclusive: z.boolean(),
  displayOrder: z.number().int().min(0),
}).strict().refine(
  (s) => !s.exclusive || (s.minCount <= 1 && (s.maxCount == null || s.maxCount === 1)),
  { message: "Exclusive slots must have minCount ≤ 1 and maxCount ≤ 1" },
).refine(
  (s) => s.maxCount == null || s.maxCount >= s.minCount,
  { message: "maxCount must be >= minCount" },
);

export const presetSlotUpdateSchema = z.object({
  minCount: z.number().int().min(0).optional(),
  maxCount: z.number().int().min(1).nullable().optional(),
  exclusive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();
