"use client";

import { SectionRow } from "./section-row";
import { AddSectionPicker } from "./add-section-picker";
import { useServiceEditor } from "./service-editor-context";
import { useSortableList } from "./use-sortable-list";

interface SectionEditorProps {
  churchId: string;
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

export function SectionEditor({ churchId }: SectionEditorProps) {
  const {
    sections,
    reorderSections,
    deleteSection,
    updateSection,
  } = useServiceEditor();

  const { dragHandleProps, itemProps, overId } = useSortableList({
    items: sections,
    onReorder: reorderSections,
  });

  const handleToggleVisible = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      await updateSection(sectionId, { visible: !section.visible });
    }
  };

  const handleDelete = async (sectionId: string) => {
    await deleteSection(sectionId);
  };

  // Group sections by majorSection for divider rendering
  const renderedMajorSections = new Set<string>();

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
                  dragHandleProps={dragHandleProps(section.id)}
                  itemProps={itemProps(section.id)}
                  isDragOver={overId === section.id}
                />
              </div>
            );
          })}
        </div>
      )}

      <AddSectionPicker
        churchId={churchId}
      />
    </div>
  );
}
