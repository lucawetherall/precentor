import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churchTemplates, churchTemplateSections } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; templateId: string }> }
) {
  const { churchId, templateId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const sections = await db
      .select()
      .from(churchTemplateSections)
      .where(eq(churchTemplateSections.churchTemplateId, templateId))
      .orderBy(asc(churchTemplateSections.positionOrder));

    return NextResponse.json(sections);
  } catch (err) {
    logger.error("Failed to fetch church template sections", err);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ churchId: string; templateId: string }> }
) {
  const { churchId, templateId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { sections } = body;

  try {
    await db
      .delete(churchTemplateSections)
      .where(eq(churchTemplateSections.churchTemplateId, templateId));

    if (sections && sections.length > 0) {
      await db.insert(churchTemplateSections).values(
        sections.map((section: {
          sectionKey: string;
          title: string;
          majorSection?: string | null;
          positionOrder: number;
          liturgicalTextId?: string | null;
          musicSlotType?: string | null;
          placeholderType?: string | null;
          optional?: boolean;
          allowOverride?: boolean;
        }, i: number) => ({
          churchTemplateId: templateId,
          sectionKey: section.sectionKey,
          title: section.title,
          majorSection: section.majorSection ?? null,
          positionOrder: section.positionOrder ?? i,
          liturgicalTextId: section.liturgicalTextId ?? null,
          musicSlotType: section.musicSlotType ?? null,
          placeholderType: section.placeholderType ?? null,
          optional: section.optional ?? false,
          allowOverride: section.allowOverride ?? false,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to save church template sections", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; templateId: string }> }
) {
  const { churchId, templateId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const result = await db
      .delete(churchTemplates)
      .where(and(eq(churchTemplates.id, templateId), eq(churchTemplates.churchId, churchId)))
      .returning({ id: churchTemplates.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Failed to delete church template", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
