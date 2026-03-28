"use client";

import { useState } from "react";
import { GripVertical, Eye, EyeOff, Trash2, Music, BookOpen, FileText, AlignLeft, ChevronDown } from "lucide-react";
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

/**
 * Get the status dot color for a section.
 * - Green: section has complete content
 * - Amber: section is a placeholder/music slot but not yet filled
 * - null: liturgical text section (always complete by definition)
 */
function getStatusDot(section: ServiceSection): "green" | "amber" | null {
  // Liturgical text sections are always complete — no dot needed
  if (section.liturgicalTextId) return null;

  // Music slot: check if assigned
  if (section.musicSlotType) {
    return section.musicSlotId ? "green" : "amber";
  }

  // Placeholder: check if value is set
  if (section.placeholderType) {
    return section.placeholderValue ? "green" : "amber";
  }

  // Custom text or generic sections — complete if they have content
  if (section.textOverride) return "green";

  return null;
}

/**
 * Get a compact assignment summary for the collapsed row.
 */
function getAssignmentSummary(section: ServiceSection): {
  text: string;
  isAssigned: boolean;
} | null {
  // Music slot assigned
  if (section.musicSlotId !== null && section.musicSlotType !== null) {
    const label = section.musicSlotType
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { text: label, isAssigned: true };
  }

  // Empty music slot
  if (section.musicSlotId === null && section.musicSlotType !== null) {
    return { text: "Not assigned", isAssigned: false };
  }

  // Placeholder with value
  if (section.placeholderType) {
    if (section.placeholderValue) {
      const label = section.placeholderType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { text: `${label} set`, isAssigned: true };
    }
    const label = section.placeholderType
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { text: label, isAssigned: false };
  }

  return null;
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
  const { icon, colorClass } = getSectionTypeInfo(section);
  const statusDot = getStatusDot(section);
  const assignmentSummary = getAssignmentSummary(section);

  // Auto-expand if music slot type is set but not assigned (needs attention)
  const shouldAutoExpand =
    section.musicSlotType !== null && section.musicSlotId === null;
  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);

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

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on action buttons or drag handle
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    setIsExpanded((prev) => !prev);
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

      {/* Header row — click to expand/collapse */}
      <div
        className="flex items-center gap-2 p-2 md:p-3 cursor-pointer select-none"
        onClick={handleHeaderClick}
      >
        {/* Drag handle */}
        <button
          className="flex-shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* Status dot */}
        {statusDot && (
          <span
            className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
              statusDot === "green" ? "bg-green-500" : "bg-amber-500"
            }`}
            aria-hidden
          />
        )}

        {/* Type icon */}
        <span className={`flex-shrink-0 ${colorClass}`} aria-hidden>
          {icon}
        </span>

        {/* Title + assignment summary */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:gap-3">
          <span className="text-sm font-heading font-semibold truncate">
            {section.title}
          </span>
          {assignmentSummary && (
            <span
              className={`text-[11px] truncate ${
                assignmentSummary.isAssigned
                  ? "text-muted-foreground"
                  : "italic text-muted-foreground/70"
              }`}
            >
              {assignmentSummary.text}
            </span>
          )}
        </div>

        {/* Hidden badge */}
        {!section.visible && (
          <Badge variant="outline" className="flex-shrink-0 text-xs rounded-sm">
            hidden
          </Badge>
        )}

        {/* Expand/collapse chevron */}
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          strokeWidth={1.5}
          aria-hidden
        />

        {/* Action buttons — visible on hover only */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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

      {/* Expandable inline controls panel */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="px-10 pb-3 pt-1 border-t border-border/40 bg-muted/20">
          <SectionInlineControl section={section} churchId={churchId} />
        </div>
      </div>
    </div>
  );
}
