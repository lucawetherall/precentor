import { db } from "@/lib/db";
import {
  churchTemplates,
  churchTemplateSections,
  serviceTypeTemplates,
  serviceTypeEnum,
  templateSections,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface ResolvedSection {
  sectionKey: string;
  title: string;
  majorSection: string | null;
  positionOrder: number;
  liturgicalTextId: string | null;
  musicSlotType: string | null;
  placeholderType: string | null;
  optional: boolean;
  allowOverride: boolean;
}

export async function resolveTemplateSections(
  churchId: string,
  serviceType: string,
): Promise<ResolvedSection[]> {
  // 1. Find the system template for this service type
  const [systemTemplate] = await db.select()
    .from(serviceTypeTemplates)
    .where(eq(serviceTypeTemplates.serviceType, serviceType as (typeof serviceTypeEnum.enumValues)[number]));
  if (!systemTemplate) return [];

  // 2. Check for church-specific override
  const [churchTemplate] = await db.select()
    .from(churchTemplates)
    .where(and(
      eq(churchTemplates.churchId, churchId),
      eq(churchTemplates.baseTemplateId, systemTemplate.id),
    ));

  // 3. Return church sections if exists, else system sections
  if (churchTemplate) {
    return db.select({
      sectionKey: churchTemplateSections.sectionKey,
      title: churchTemplateSections.title,
      majorSection: churchTemplateSections.majorSection,
      positionOrder: churchTemplateSections.positionOrder,
      liturgicalTextId: churchTemplateSections.liturgicalTextId,
      musicSlotType: churchTemplateSections.musicSlotType,
      placeholderType: churchTemplateSections.placeholderType,
      optional: churchTemplateSections.optional,
      allowOverride: churchTemplateSections.allowOverride,
    })
      .from(churchTemplateSections)
      .where(eq(churchTemplateSections.churchTemplateId, churchTemplate.id))
      .orderBy(asc(churchTemplateSections.positionOrder));
  }

  return db.select({
    sectionKey: templateSections.sectionKey,
    title: templateSections.title,
    majorSection: templateSections.majorSection,
    positionOrder: templateSections.positionOrder,
    liturgicalTextId: templateSections.liturgicalTextId,
    musicSlotType: templateSections.musicSlotType,
    placeholderType: templateSections.placeholderType,
    optional: templateSections.optional,
    allowOverride: templateSections.allowOverride,
  })
    .from(templateSections)
    .where(eq(templateSections.templateId, systemTemplate.id))
    .orderBy(asc(templateSections.positionOrder));
}
