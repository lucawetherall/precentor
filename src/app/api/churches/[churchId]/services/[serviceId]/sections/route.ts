import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSections } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  try {
    const sections = await db
      .select()
      .from(serviceSections)
      .where(eq(serviceSections.serviceId, serviceId))
      .orderBy(asc(serviceSections.positionOrder));

    return NextResponse.json(sections);
  } catch (err) {
    logger.error("Failed to fetch service sections", err);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> }
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { sections } = body;

  try {
    await db.delete(serviceSections).where(eq(serviceSections.serviceId, serviceId));

    if (sections && sections.length > 0) {
      await db.insert(serviceSections).values(
        sections.map((section: {
          sectionKey: string;
          title: string;
          majorSection?: string | null;
          positionOrder: number;
          liturgicalTextId?: string | null;
          textOverride?: { speaker: string; text: string }[] | null;
          musicSlotId?: string | null;
          placeholderType?: string | null;
          placeholderValue?: string | null;
          visible?: boolean;
        }, i: number) => ({
          serviceId,
          sectionKey: section.sectionKey,
          title: section.title,
          majorSection: section.majorSection ?? null,
          positionOrder: section.positionOrder ?? i,
          liturgicalTextId: section.liturgicalTextId ?? null,
          textOverride: section.textOverride ?? null,
          musicSlotId: section.musicSlotId ?? null,
          placeholderType: section.placeholderType ?? null,
          placeholderValue: section.placeholderValue ?? null,
          visible: section.visible ?? true,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to save service sections", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
