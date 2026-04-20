import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { churchMemberships } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

const VALID_ROLES = ["ADMIN", "EDITOR", "MEMBER"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string }> }
) {
  const { churchId, memberId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if ("role" in body) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Prevent demoting the last admin
    if (body.role !== "ADMIN") {
      const membership = await db
        .select()
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.id, memberId),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .limit(1);
      if (membership.length > 0 && membership[0].role === "ADMIN") {
        const adminCount = await db
          .select({ count: sql`count(*)` })
          .from(churchMemberships)
          .where(
            and(
              eq(churchMemberships.churchId, churchId),
              eq(churchMemberships.role, "ADMIN")
            )
          );
        if (Number(adminCount[0].count) <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last admin" },
            { status: 400 }
          );
        }
      }
    }
    updates.role = body.role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const result = await db
      .update(churchMemberships)
      .set(updates)
      .where(
        and(
          eq(churchMemberships.id, memberId),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (err) {
    logger.error("Failed to update member", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string }> }
) {
  const { churchId, memberId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    // Prevent deleting the last admin
    const membership = await db
      .select()
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.id, memberId),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .limit(1);
    if (membership.length > 0 && membership[0].role === "ADMIN") {
      const adminCount = await db
        .select({ count: sql`count(*)` })
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.churchId, churchId),
            eq(churchMemberships.role, "ADMIN")
          )
        );
      if (Number(adminCount[0].count) <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    const result = await db
      .delete(churchMemberships)
      .where(
        and(
          eq(churchMemberships.id, memberId),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to remove member", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
