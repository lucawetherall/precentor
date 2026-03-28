"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Music, BookOpen, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

interface TemplateSection {
  id: string;
  sectionKey: string;
  title: string;
  majorSection: string | null;
  positionOrder: number;
  musicSlotType: string | null;
  placeholderType: string | null;
  optional: boolean;
}

interface TemplateEntry {
  systemTemplateId: string;
  serviceType: string;
  name: string;
  rite: string;
  hasCustomTemplate: boolean;
  churchTemplateId: string | null;
  systemSections: TemplateSection[];
  churchSections: TemplateSection[];
}

interface TemplateAdminClientProps {
  churchId: string;
  templates: TemplateEntry[];
}

function getSectionTypeIcon(section: TemplateSection) {
  if (section.musicSlotType) {
    return <Music className="h-3.5 w-3.5 text-primary flex-shrink-0" strokeWidth={1.5} />;
  }
  if (section.placeholderType) {
    return <BookOpen className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" strokeWidth={1.5} />;
  }
  return <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />;
}

function SectionList({ sections }: { sections: TemplateSection[] }) {
  const renderedMajorSections = new Set<string>();

  if (sections.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 px-3">No sections defined.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {sections.map((section) => {
        const showDivider =
          section.majorSection && !renderedMajorSections.has(section.majorSection);

        if (showDivider && section.majorSection) {
          renderedMajorSections.add(section.majorSection);
        }

        return (
          <div key={section.id}>
            {showDivider && section.majorSection && (
              <div className="px-3 py-1.5 bg-muted/40">
                <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-widest">
                  {section.majorSection}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2">
              {getSectionTypeIcon(section)}
              <span className="text-sm font-heading flex-1">{section.title}</span>
              {section.optional && (
                <Badge variant="outline" className="text-xs rounded-sm">
                  optional
                </Badge>
              )}
              {section.musicSlotType && (
                <span className="text-xs text-muted-foreground">
                  {section.musicSlotType.replace(/_/g, " ").toLowerCase()}
                </span>
              )}
              {section.placeholderType && (
                <span className="text-xs text-muted-foreground">
                  {section.placeholderType.replace(/-/g, " ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateCard({
  template,
  onCustomise,
  onReset,
}: {
  template: TemplateEntry;
  onCustomise: (systemTemplateId: string) => Promise<void>;
  onReset: (churchTemplateId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);

  const displaySections = template.hasCustomTemplate
    ? template.churchSections
    : template.systemSections;

  const handleCustomise = async () => {
    setActioning(true);
    await onCustomise(template.systemTemplateId);
    setActioning(false);
  };

  const handleReset = async () => {
    if (!template.churchTemplateId) return;
    const confirmed = window.confirm(
      "Delete the custom template for this service type? The system default will be used instead."
    );
    if (!confirmed) return;
    setActioning(true);
    await onReset(template.churchTemplateId);
    setActioning(false);
  };

  return (
    <div className="border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          )}
          <div className="min-w-0">
            <span className="font-heading text-base font-semibold">{template.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{template.rite}</span>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {template.hasCustomTemplate ? (
            <>
              <Badge className="text-xs rounded-sm bg-primary/10 text-primary border-primary/20">
                Custom
              </Badge>
              <button
                onClick={handleReset}
                disabled={actioning}
                className="text-xs text-destructive hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {actioning ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : null}
                Reset to default
              </button>
            </>
          ) : (
            <button
              onClick={handleCustomise}
              disabled={actioning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm disabled:opacity-50"
            >
              {actioning ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              ) : null}
              Customise
            </button>
          )}
        </div>
      </div>

      {/* Section list */}
      {expanded && (
        <div className="border-t border-border">
          {template.hasCustomTemplate && (
            <p className="text-xs text-muted-foreground px-3 py-2 bg-primary/5 border-b border-border">
              Showing custom template ({displaySections.length} sections)
            </p>
          )}
          <SectionList sections={displaySections} />
        </div>
      )}
    </div>
  );
}

export function TemplateAdminClient({
  churchId,
  templates: initialTemplates,
}: TemplateAdminClientProps) {
  const [templates, setTemplates] = useState<TemplateEntry[]>(initialTemplates);
  const { addToast } = useToast();

  const handleCustomise = async (systemTemplateId: string) => {
    try {
      const res = await fetch(`/api/churches/${churchId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseTemplateId: systemTemplateId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        addToast(data?.error ?? "Failed to create custom template", "error");
        return;
      }

      const newTemplate = await res.json();

      // Fetch the sections for the new template
      let churchSections: TemplateSection[] = [];
      const sectionsRes = await fetch(
        `/api/churches/${churchId}/templates/${newTemplate.id}/sections`
      );
      if (sectionsRes.ok) {
        const rawSections = await sectionsRes.json();
        churchSections = rawSections.map((s: TemplateSection) => ({
          id: s.id,
          sectionKey: s.sectionKey,
          title: s.title,
          majorSection: s.majorSection ?? null,
          positionOrder: s.positionOrder,
          musicSlotType: s.musicSlotType ?? null,
          placeholderType: s.placeholderType ?? null,
          optional: s.optional,
        }));
      }

      setTemplates((prev) =>
        prev.map((t) =>
          t.systemTemplateId === systemTemplateId
            ? {
                ...t,
                hasCustomTemplate: true,
                churchTemplateId: newTemplate.id,
                churchSections,
              }
            : t
        )
      );

      addToast("Custom template created", "success");
    } catch {
      addToast("Network error — could not create template", "error");
    }
  };

  const handleReset = async (churchTemplateId: string) => {
    try {
      const res = await fetch(
        `/api/churches/${churchId}/templates/${churchTemplateId}/sections`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        addToast(data?.error ?? "Failed to reset template", "error");
        return;
      }

      setTemplates((prev) =>
        prev.map((t) =>
          t.churchTemplateId === churchTemplateId
            ? {
                ...t,
                hasCustomTemplate: false,
                churchTemplateId: null,
                churchSections: [],
              }
            : t
        )
      );

      addToast("Template reset to default", "success");
    } catch {
      addToast("Network error — could not reset template", "error");
    }
  };

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.systemTemplateId}
          template={template}
          onCustomise={handleCustomise}
          onReset={handleReset}
        />
      ))}
    </div>
  );
}
