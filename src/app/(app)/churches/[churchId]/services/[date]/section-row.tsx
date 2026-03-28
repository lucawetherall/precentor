"use client";

import { GripVertical, Eye, EyeOff, Trash2, Music, BookOpen, FileText, AlignLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionInlineControl } from "./section-inline-control";

export interface ServiceSection {
  id: string;
  sectionKey: string;
  title: string;
  majorSection: string | null;
  positionOrder: number;
  liturgicalTextId: string | null;
  musicSlotType: string | null;
  musicSlotId: string | null;
  placeholderType: string | null;
  placeholderValue: string | null;
  textOverride: unknown;
  visible: boolean;
  notes: string | null;
}

interface SectionRowProps {
  section: ServiceSection;
  churchId: string;
  onDelete: (sectionId: string) => void;
  onToggleVisible: (sectionId: string) => void;
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement> & {
    style: React.CSSProperties;
    "aria-label": string;
    tabIndex: number;
    role: string;
  };
  itemProps: {
    "data-sortable-id": string;
    style: React.CSSProperties;
    "aria-grabbed": boolean;
  };
  isDragOver: boolean;
}

const MUSIC_PLACEHOLDER_TYPES = new Set(["hymn", "psalm", "anthem"]);

function getSectionTypeInfo(section: ServiceSection): {
  icon: React.ReactNode;
  colorClass: string;
  summary: string;
} {
  // Client-side musicSlotType (from template sections) or music placeholder types
  if (
    section.musicSlotType ||
    (section.placeholderType && MUSIC_PLACEHOLDER_TYPES.has(section.placeholderType))
  ) {
    const raw = section.musicSlotType ?? section.placeholderType ?? "";
    const label = raw
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      icon: <Music className="h-4 w-4" strokeWidth={1.5} />,
      colorClass: "text-primary",
      summary: label,
    };
  }
  if (section.liturgicalTextId) {
    return {
      icon: <BookOpen className="h-4 w-4" strokeWidth={1.5} />,
      colorClass: "text-blue-700",
      summary: "Liturgical text",
    };
  }
  if (section.placeholderType) {
    const label = section.placeholderType
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      icon: <FileText className="h-4 w-4" strokeWidth={1.5} />,
      colorClass: "text-amber-700",
      summary: section.placeholderValue ? section.placeholderValue : label,
    };
  }
  if (section.textOverride) {
    return {
      icon: <AlignLeft className="h-4 w-4" strokeWidth={1.5} />,
      colorClass: "text-slate-600",
      summary: "Custom text",
    };
  }
  return {
    icon: <FileText className="h-4 w-4" strokeWidth={1.5} />,
    colorClass: "text-muted-foreground",
    summary: section.sectionKey,
  };
}

export function SectionRow({
  section,
  churchId,
  onDelete,
  onToggleVisible,
  dragHandleProps,
  itemProps,
  isDragOver,
}: SectionRowProps) {
  const { icon, colorClass, summary } = getSectionTypeInfo(section);

  const handleDeleteClick = () => {
    const isLiturgical = !!section.liturgicalTextId;
    const confirmed = isLiturgical
      ? window.confirm(
          `Remove "${section.title}" from this service? This will delete the liturgical text section.`
        )
      : true;
    if (confirmed) {
      onDelete(section.id);
    }
  };

  return (
    <div
      className={`group relative border border-border bg-card shadow-sm transition-opacity ${
        !section.visible ? "opacity-50" : ""
      } ${isDragOver ? "border-primary border-t-2" : ""}`}
      {...itemProps}
    >
      {/* Drop indicator line */}
      {isDragOver && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
      )}

      <div className="flex items-center gap-2 p-2 md:p-3">
        {/* Drag handle */}
        <button
          className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Type icon */}
        <span className={`flex-shrink-0 ${colorClass}`} aria-hidden>
          {icon}
        </span>

        {/* Title + summary */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:gap-3">
          <span className="text-sm font-heading font-semibold truncate">
            {section.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {summary}
          </span>
        </div>

        {/* Hidden badge */}
        {!section.visible && (
          <Badge variant="outline" className="flex-shrink-0 text-xs rounded-sm">
            hidden
          </Badge>
        )}

        {/* Inline controls */}
        <div className="flex-shrink-0 hidden md:block">
          <SectionInlineControl section={section} churchId={churchId} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleVisible(section.id)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={section.visible ? "Hide section" : "Show section"}
            title={section.visible ? "Hide" : "Show"}
          >
            {section.visible ? (
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>

          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Delete ${section.title}`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
