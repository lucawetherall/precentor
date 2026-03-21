import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { rotaEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const body = await request.json();
  const { userId, serviceId, confirmed } = body;

  try {
    if (confirmed) {
      await db
        .insert(rotaEntries)
        .values({ userId, serviceId, confirmed: true })
        .onConflictDoUpdate({
          target: [rotaEntries.serviceId, rotaEntries.userId],
          set: { confirmed: true },
        });
    } else {
      await db
        .delete(rotaEntries)
        .where(
          and(
            eq(rotaEntries.userId, userId),
            eq(rotaEntries.serviceId, serviceId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update rota:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
