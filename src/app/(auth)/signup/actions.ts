"use server";

import { passwordSchema } from "@/lib/validation/schemas";

/** Returns an error message string, or null if valid. */
export async function validatePasswordAction(password: string): Promise<string | null> {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
