import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churchTemplates, churchTemplateSections, musicSlotTypeEnum } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { parseJsonBody } from "@/lib/api/parse-body";

const churchTemplateSectionsPutSchema = z.object({
  sections: z
    .array(
      z.object({
        sectionKey: z.string(),
        title: z.string(),
        majorSection: z.string().nullable().optional(),
        positionOrder: z.number().int().optional(),
        liturgicalTextId: z.string().uuid().nullable().optional(),
        musicSlotType: z.enum(musicSlotTypeEnum.enumValues).nullable().optional(),
        placeholderType: z.string().nullable().optional(),
        optional: z.boolean().optional(),
        allowOverride: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; templateId: string }> }
) {
  const { churchId, templateId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const [template] = await db
      .select({ id: churchTemplates.id })
      .from(churchTemplates)
      .where(and(eq(churchTemplates.id, templateId), eq(churchTemplates.churchId, churchId)))
      .limit(1);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

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

  const { data, error: bodyError } = await parseJsonBody(request, churchTemplateSectionsPutSchema);
  if (bodyError) return bodyError;
  const { sections } = data;

  try {
    const [template] = await db
      .select({ id: churchTemplates.id })
      .from(churchTemplates)
      .where(and(eq(churchTemplates.id, templateId), eq(churchTemplates.churchId, churchId)))
      .limit(1);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db
      .delete(churchTemplateSections)
      .where(eq(churchTemplateSections.churchTemplateId, templateId));

    if (sections.length > 0) {
      await db.insert(churchTemplateSections).values(
        sections.map((section, i) => ({
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
