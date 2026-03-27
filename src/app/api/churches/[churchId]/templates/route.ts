import { NextResponse } from "next/server";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  churchTemplates,
  churchTemplateSections,
  serviceTypeTemplates,
  templateSections,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  try {
    const results = await db.select({
      id: churchTemplates.id,
      name: churchTemplates.name,
      baseTemplateId: churchTemplates.baseTemplateId,
      serviceType: serviceTypeTemplates.serviceType,
      rite: serviceTypeTemplates.rite,
    }).from(churchTemplates)
      .innerJoin(serviceTypeTemplates, eq(churchTemplates.baseTemplateId, serviceTypeTemplates.id))
      .where(eq(churchTemplates.churchId, churchId));

    return NextResponse.json(results);
  } catch (err) {
    logger.error("Failed to fetch church templates", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> }
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { baseTemplateId } = body;
  if (!baseTemplateId) {
    return NextResponse.json({ error: "baseTemplateId is required" }, { status: 400 });
  }

  try {
    // Fetch the base template to get its name
    const [baseTemplate] = await db
      .select()
      .from(serviceTypeTemplates)
      .where(eq(serviceTypeTemplates.id, baseTemplateId))
      .limit(1);

    if (!baseTemplate) {
      return NextResponse.json({ error: "Base template not found" }, { status: 404 });
    }

    // Insert the new church template
    const [newTemplate] = await db
      .insert(churchTemplates)
      .values({
        churchId,
        baseTemplateId,
        name: baseTemplate.name,
      })
      .returning();

    // Copy sections from the base template
    const baseSections = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, baseTemplateId));

    if (baseSections.length > 0) {
      await db.insert(churchTemplateSections).values(
        baseSections.map((section) => ({
          churchTemplateId: newTemplate.id,
          sectionKey: section.sectionKey,
          title: section.title,
          majorSection: section.majorSection ?? null,
          positionOrder: section.positionOrder,
          liturgicalTextId: section.liturgicalTextId ?? null,
          musicSlotType: section.musicSlotType ?? null,
          placeholderType: section.placeholderType ?? null,
          optional: section.optional,
          allowOverride: section.allowOverride,
        }))
      );
    }

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (err) {
    logger.error("Failed to create church template", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
