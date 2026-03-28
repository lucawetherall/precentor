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
      {sections.length === 0 ? (
        <div className="border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="font-heading text-xl text-muted-foreground mb-1">Ready to plan</p>
          <p className="text-sm text-muted-foreground/70">Add sections to build the running order</p>
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
