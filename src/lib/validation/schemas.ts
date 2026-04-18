import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();

/**
 * Accepts only `https://` URLs, up to 2048 chars (RFC-tolerable ceiling). Uses
 * the WHATWG `URL` parser so values like `javascript:`, `data:`, `file:`,
 * `mailto:` and malformed strings are rejected.
 */
export const httpsUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL must be 2048 characters or fewer")
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid https:// URL");

/**
 * Label for the sheet-music-library link rendered on the repertoire page.
 * Optional — omitted/empty values fall back to a default label at render time.
 */
export const sheetMusicLinkSchema = z
  .object({
    url: httpsUrlSchema,
    label: z
      .string()
      .trim()
      .max(60, "Label must be 60 characters or fewer")
      .optional(),
  })
  .strict();

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

export const quickInviteSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).default("MEMBER"),
});

export const churchUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  diocese: z.string().max(200).nullable().optional(),
  ccliNumber: z.string().max(50).nullable().optional(),
  // `null` clears the existing link; `undefined` leaves it unchanged.
  sheetMusicLink: sheetMusicLinkSchema.nullable().optional(),
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
