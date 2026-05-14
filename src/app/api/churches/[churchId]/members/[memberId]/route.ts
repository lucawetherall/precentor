import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { churchMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/api/parse-body";

const memberUpdateSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "MEMBER"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string }> }
) {
  const { churchId, memberId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const { data, error: bodyError } = await parseJsonBody(request, memberUpdateSchema);
  if (bodyError) return bodyError;

  const updates: Record<string, string | null> = {};
  if (data.role !== undefined) updates.role = data.role;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    // Wrap the last-admin guard and the update in a single transaction so two
    // concurrent demotions can't both observe count=2 and leave 0 admins.
    // Lock the admin rows with FOR UPDATE so concurrent transactions serialize
    // — otherwise both reads see the original count under READ COMMITTED.
    const result = await db.transaction(async (tx) => {
      if (updates.role && updates.role !== "ADMIN") {
        const admins = await tx
          .select({ id: churchMemberships.id })
          .from(churchMemberships)
          .where(
            and(
              eq(churchMemberships.churchId, churchId),
              eq(churchMemberships.role, "ADMIN")
            )
          )
          .for("update");
        const targetIsAdmin = admins.some((a) => a.id === memberId);
        if (targetIsAdmin && admins.length <= 1) {
          return { lastAdmin: true as const };
        }
      }

      const rows = await tx
        .update(churchMemberships)
        .set(updates)
        .where(
          and(
            eq(churchMemberships.id, memberId),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .returning();
      return { lastAdmin: false as const, rows };
    });

    if (result.lastAdmin) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
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
    // Wrap the last-admin guard and the delete in a single transaction so two
    // concurrent deletes can't both observe count=2 and leave 0 admins. Lock
    // the admin rows with FOR UPDATE so concurrent transactions serialize.
    const result = await db.transaction(async (tx) => {
      const admins = await tx
        .select({ id: churchMemberships.id })
        .from(churchMemberships)
        .where(
          and(
            eq(churchMemberships.churchId, churchId),
            eq(churchMemberships.role, "ADMIN")
          )
        )
        .for("update");
      const targetIsAdmin = admins.some((a) => a.id === memberId);
      if (targetIsAdmin && admins.length <= 1) {
        return { lastAdmin: true as const };
      }

      const rows = await tx
        .delete(churchMemberships)
        .where(
          and(
            eq(churchMemberships.id, memberId),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .returning();
      return { lastAdmin: false as const, rows };
    });

    if (result.lastAdmin) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to remove member", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
