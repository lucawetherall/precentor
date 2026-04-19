import { requireAuth } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roleCatalog } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const rows = await db.select().from(roleCatalog).orderBy(asc(roleCatalog.displayOrder));
  return apiSuccess(rows);
}
