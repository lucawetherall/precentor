"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Check } from "lucide-react";
import { SectionRow } from "./section-row";
import { AddSectionPicker } from "./add-section-picker";
import type { ServiceSection } from "./section-row";

interface SectionEditorProps {
  churchId: string;
  serviceId: string;
}

function MajorSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-widest px-1">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function SectionEditor({ churchId, serviceId }: SectionEditorProps) {
  const [sections, setSections] = useState<ServiceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Drag state
  const dragSectionIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSections() {
      try {
        const res = await fetch(
          `/api/churches/${churchId}/services/${serviceId}/sections`
        );
        if (res.ok) {
          const data: ServiceSection[] = await res.json();
          setSections(data);
        }
      } catch {
        // leave empty
      }
      setLoading(false);
    }
    loadSections();
  }, [churchId, serviceId]);

  const persistSections = async (updated: ServiceSection[]) => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/sections`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: updated }),
        }
      );
      if (!res.ok) {
        setSaveError("Failed to save order");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setSaveError("Network error — could not save");
    }
    setSaving(false);
  };

  const handleToggleVisible = async (sectionId: string) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    setSections(updated);
    await persistSections(updated);
  };

  const handleDelete = async (sectionId: string) => {
    const updated = sections
      .filter((s) => s.id !== sectionId)
      .map((s, i) => ({ ...s, positionOrder: i }));
    setSections(updated);
    await persistSections(updated);
  };

  const handleSectionAdded = (section: ServiceSection) => {
    setSections((prev) => [...prev, section]);
  };

  // ── Drag and drop ──────────────────────────────────────────

  const handleDragStart = (_e: React.DragEvent, sectionId: string) => {
    dragSectionIdRef.current = sectionId;
  };

  const handleDragOver = (_e: React.DragEvent, sectionId: string) => {
    if (dragSectionIdRef.current && dragSectionIdRef.current !== sectionId) {
      setDragOverId(sectionId);
    }
  };

  const handleDragEnd = async () => {
    const dragId = dragSectionIdRef.current;
    const overId = dragOverId;

    dragSectionIdRef.current = null;
    setDragOverId(null);

    if (!dragId || !overId || dragId === overId) return;

    const dragIndex = sections.findIndex((s) => s.id === dragId);
    const overIndex = sections.findIndex((s) => s.id === overId);
    if (dragIndex === -1 || overIndex === -1) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(overIndex, 0, moved);

    const withNewOrder = reordered.map((s, i) => ({
      ...s,
      positionOrder: i,
    }));

    setSections(withNewOrder);
    await persistSections(withNewOrder);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-sm" />
        ))}
      </div>
    );
  }

  // Group sections by majorSection for divider rendering
  const renderedMajorSections = new Set<string>();

  const nextPositionOrder = sections.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wide">
          Running Order
        </h3>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            Saving…
          </span>
        )}
        {saved && !saving && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" strokeWidth={2} />
            Saved
          </span>
        )}
        {saveError && !saving && (
          <span className="text-xs text-destructive">{saveError}</span>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center rounded-sm">
          <p className="text-muted-foreground text-sm">
            No sections yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {sections.map((section) => {
            const showDivider =
              section.majorSection &&
              !renderedMajorSections.has(section.majorSection);

            if (showDivider && section.majorSection) {
              renderedMajorSections.add(section.majorSection);
            }

            return (
              <div key={section.id}>
                {showDivider && section.majorSection && (
                  <MajorSectionDivider label={section.majorSection} />
                )}
                <SectionRow
                  section={section}
                  onDelete={handleDelete}
                  onToggleVisible={handleToggleVisible}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverId === section.id}
                />
              </div>
            );
          })}
        </div>
      )}

      <AddSectionPicker
        churchId={churchId}
        serviceId={serviceId}
        nextPositionOrder={nextPositionOrder}
        onSectionAdded={handleSectionAdded}
      />
    </div>
  );
}
