import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { anthems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, getChurchMembership } from "@/lib/auth/permissions";
import { uuidSchema } from "@/lib/validation/schemas";

/**
 * Fetch a single anthem by id, for displaying a slot's saved selection in the
 * service editor (mirrors /api/mass-settings/[id]). Anthems are either global
 * (church_id NULL) or owned by a church; a church-owned anthem is only visible
 * to members of that church.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ anthemId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { anthemId } = await params;
  // A malformed UUID can't reference an existing row; unvalidated it surfaces
  // as a DB-level 500.
  if (!uuidSchema.safeParse(anthemId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [anthem] = await db
    .select()
    .from(anthems)
    .where(eq(anthems.id, anthemId))
    .limit(1);

  if (!anthem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Church-scoped anthems are only visible to members of that church. Global
  // anthems (no churchId) are reference data visible to any signed-in user.
  if (anthem.churchId) {
    const membership = await getChurchMembership(user!.id, anthem.churchId);
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({
    id: anthem.id,
    title: anthem.title,
    composer: anthem.composer,
    voicing: anthem.voicing,
  });
}
