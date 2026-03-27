import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  churchMemberships,
  users,
  serviceTypeTemplates,
  templateSections,
  churchTemplates,
  churchTemplateSections,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hasMinRole } from "@/lib/auth/permissions";
import type { MemberRole } from "@/types";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { TemplateAdminClient } from "./template-admin-client";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function TemplatesAdminPage({ params }: Props) {
  const { churchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ADMIN role
  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);

    if (dbUser.length === 0) redirect("/churches");

    const membership = await db
      .select({ role: churchMemberships.role })
      .from(churchMemberships)
      .where(
        and(
          eq(churchMemberships.userId, dbUser[0].id),
          eq(churchMemberships.churchId, churchId)
        )
      )
      .limit(1);

    if (membership.length === 0) redirect("/churches");

    const role = membership[0].role as MemberRole;
    if (!hasMinRole(role, "ADMIN")) redirect(`/churches/${churchId}/services`);
  } catch {
    redirect("/churches");
  }

  // Fetch all system service type templates
  let systemTemplates: {
    id: string;
    serviceType: string;
    name: string;
    rite: string;
  }[] = [];

  const systemSectionsMap: Map<
    string,
    {
      id: string;
      sectionKey: string;
      title: string;
      majorSection: string | null;
      positionOrder: number;
      musicSlotType: string | null;
      placeholderType: string | null;
      optional: boolean;
    }[]
  > = new Map();

  const churchTemplateMap: Map<
    string,
    { id: string; name: string; baseTemplateId: string }
  > = new Map();

  const churchSectionsMap: Map<
    string,
    {
      id: string;
      sectionKey: string;
      title: string;
      majorSection: string | null;
      positionOrder: number;
      musicSlotType: string | null;
      placeholderType: string | null;
      optional: boolean;
    }[]
  > = new Map();

  try {
    // System templates
    const sysTemplates = await db.select().from(serviceTypeTemplates);
    systemTemplates = sysTemplates.map((t) => ({
      id: t.id,
      serviceType: t.serviceType,
      name: t.name,
      rite: t.rite,
    }));

    // System template sections
    const allSystemSections = await db.select().from(templateSections);
    for (const section of allSystemSections) {
      if (!systemSectionsMap.has(section.templateId)) {
        systemSectionsMap.set(section.templateId, []);
      }
      systemSectionsMap.get(section.templateId)!.push({
        id: section.id,
        sectionKey: section.sectionKey,
        title: section.title,
        majorSection: section.majorSection ?? null,
        positionOrder: section.positionOrder,
        musicSlotType: section.musicSlotType ?? null,
        placeholderType: section.placeholderType ?? null,
        optional: section.optional,
      });
    }

    // Church templates for this church
    const churchTemplatesRows = await db
      .select()
      .from(churchTemplates)
      .where(eq(churchTemplates.churchId, churchId));

    for (const ct of churchTemplatesRows) {
      churchTemplateMap.set(ct.baseTemplateId, {
        id: ct.id,
        name: ct.name,
        baseTemplateId: ct.baseTemplateId,
      });
    }

    // Fetch sections for each church template
    for (const ct of churchTemplatesRows) {
      const ctSections = await db
        .select()
        .from(churchTemplateSections)
        .where(eq(churchTemplateSections.churchTemplateId, ct.id));

      churchSectionsMap.set(ct.id, ctSections.map((s) => ({
        id: s.id,
        sectionKey: s.sectionKey,
        title: s.title,
        majorSection: s.majorSection ?? null,
        positionOrder: s.positionOrder,
        musicSlotType: s.musicSlotType ?? null,
        placeholderType: s.placeholderType ?? null,
        optional: s.optional,
      })));
    }
  } catch {
    // DB not available — show empty state
  }

  // Build the data structure for the client component
  const templateData = systemTemplates.map((sysTemplate) => {
    const churchTemplate = churchTemplateMap.get(sysTemplate.id);
    const systemSections = (systemSectionsMap.get(sysTemplate.id) ?? []).sort(
      (a, b) => a.positionOrder - b.positionOrder
    );
    const churchSections = churchTemplate
      ? (churchSectionsMap.get(churchTemplate.id) ?? []).sort(
          (a, b) => a.positionOrder - b.positionOrder
        )
      : [];

    return {
      systemTemplateId: sysTemplate.id,
      serviceType: sysTemplate.serviceType,
      name:
        SERVICE_TYPE_LABELS[sysTemplate.serviceType as ServiceType] ??
        sysTemplate.name,
      rite: sysTemplate.rite,
      hasCustomTemplate: !!churchTemplate,
      churchTemplateId: churchTemplate?.id ?? null,
      systemSections,
      churchSections,
    };
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-2">
        Service Templates
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Customise the section structure for each service type. Custom templates
        override the system defaults for your church.
      </p>

      {templateData.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No service type templates available.
          </p>
        </div>
      ) : (
        <TemplateAdminClient
          churchId={churchId}
          templates={templateData}
        />
      )}
    </div>
  );
}
