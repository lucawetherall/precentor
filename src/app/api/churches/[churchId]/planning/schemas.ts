import { z } from "zod";
import { serviceTypeEnum } from "@/lib/db/schema";
import { COLUMN_ORDER } from "@/lib/planning/columns";
import { isRealCalendarDate } from "@/lib/planning/dates";
import { MAX_CELL_TEXT_LEN } from "./_write-cell";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ghostSchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE, "ghost.date must be YYYY-MM-DD")
    .refine(isRealCalendarDate, "ghost.date must be a real calendar date"),
  serviceType: z.enum(serviceTypeEnum.enumValues, "ghost.serviceType is invalid"),
  time: z.string().nullable().optional(),
});

const cellValueSchema = z.object({
  refId: z.string().uuid("value.refId must be a UUID or null").nullable().optional(),
  text: z
    .string("value.text must be a string or null")
    .max(MAX_CELL_TEXT_LEN, `value.text must be ${MAX_CELL_TEXT_LEN} characters or fewer`)
    .nullable()
    .optional(),
});

export const cellPatchSchema = z.object({
  serviceId: z.string().uuid().optional(),
  ghost: ghostSchema.optional(),
  column: z.enum(COLUMN_ORDER, "Invalid column"),
  value: cellValueSchema,
  expectedUpdatedAt: z.string().nullable().optional(),
});

export const cellBulkSchema = z.object({
  changes: z
    .array(
      z.object({
        serviceId: z.string().uuid().optional(),
        ghost: ghostSchema.optional(),
        column: z.enum(COLUMN_ORDER, "column is invalid"),
        value: cellValueSchema,
      }),
    )
    .min(1, "changes required")
    .max(1000, "too many changes (max 1000)"),
});
