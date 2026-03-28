"use client";

import { useRef, useState } from "react";
import { SectionRow } from "./section-row";
import { AddSectionPicker } from "./add-section-picker";
import { useServiceEditor } from "./service-editor-context";
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
  const {
    sections,
    reorderSections,
    deleteSection,
    updateSection,
    refreshSections,
  } = useServiceEditor();

  // Drag state
  const dragSectionIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleToggleVisible = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      await updateSection(sectionId, { visible: !section.visible });
    }
  };

  const handleDelete = async (sectionId: string) => {
    await deleteSection(sectionId);
  };

  const handleSectionAdded = (_section: ServiceSection) => {
    // AddSectionPicker uses its own PUT-all endpoint to add sections.
    // Re-fetch from the server to sync context state with what was persisted.
    // TODO: In a future phase, AddSectionPicker should use addSection from context.
    refreshSections();
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

    const orderedIds = reordered.map((s) => s.id);
    await reorderSections(orderedIds);
  };

  // Group sections by majorSection for divider rendering
  const renderedMajorSections = new Set<string>();

  const nextPositionOrder = sections.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wide">
          Running Order
        </h3>
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
                  churchId={churchId}
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
