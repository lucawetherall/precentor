"use client";

import { useState, useRef, useEffect } from "react";
import { StickyNote, Plus } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";

interface SectionNotesProps {
  sectionId: string;
}

export function SectionNotes({ sectionId }: SectionNotesProps) {
  const { sections, updateSection } = useServiceEditor();
  const section = sections.find((s) => s.id === sectionId);

  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(section?.notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync value when section notes change externally (e.g. undo)
  useEffect(() => {
    const notes = section?.notes ?? "";
    setValue(notes);
  }, [section?.notes]);

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  const handleBlur = () => {
    const trimmed = value.trim();
    const currentNotes = section?.notes ?? "";
    if (trimmed !== currentNotes) {
      updateSection(sectionId, { notes: trimmed || null });
    }
    if (!trimmed) {
      setExpanded(false);
    }
  };

  const hasNotes = !!(section?.notes);
  const truncatedNote = section?.notes
    ? section.notes.split("\n")[0].slice(0, 60) + (section.notes.length > 60 ? "..." : "")
    : null;

  if (expanded) {
    return (
      <div className="mt-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add a note..."
          rows={2}
          className="w-full text-xs border border-input bg-transparent px-2 py-1 rounded-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[40px]"
          aria-label="Section notes"
        />
      </div>
    );
  }

  if (hasNotes) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        aria-label="Edit note"
        title={section?.notes ?? ""}
      >
        <StickyNote className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
        <span className="truncate max-w-[180px]">{truncatedNote}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
      aria-label="Add note"
    >
      <Plus className="h-3 w-3" strokeWidth={1.5} />
      <span>Add note</span>
    </button>
  );
}
