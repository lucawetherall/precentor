"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileDown, FileText, Check } from "lucide-react";
import type { BookletServiceSheetData, SummaryServiceSheetData, ResolvedDbSection } from "@/types/service-sheet";
import type { LiturgicalTextBlock } from "@/data/liturgy/types";
import { useServiceEditor } from "./service-editor-context";

type SheetData = BookletServiceSheetData | SummaryServiceSheetData;

interface BookletPreviewProps {
  churchId: string;
  serviceId: string;
  mode?: "booklet" | "summary";
  isVisible?: boolean;
}

function speakerLabel(speaker: string): string {
  const labels: Record<string, string> = {
    president: "President",
    deacon: "Deacon",
    all: "All",
    reader: "Reader",
    cantor: "Cantor",
    choir: "Choir",
    rubric: "",
  };
  return labels[speaker] ?? speaker;
}

interface RawServiceSection {
  id: string;
  serviceId: string;
  sectionKey: string;
  title: string;
  majorSection: string | null;
  positionOrder: number;
  liturgicalTextId: string | null;
  textOverride: LiturgicalTextBlock[] | null;
  musicSlotId: string | null;
  musicSlotType: string | null;
  placeholderType: string | null;
  placeholderValue: string | null;
  visible: boolean;
}

interface EditableBlockProps {
  block: LiturgicalTextBlock;
  blockIndex: number;
  allBlocks: LiturgicalTextBlock[];
  onBlocksChange: (newBlocks: LiturgicalTextBlock[]) => void;
  saving: boolean;
}

function EditableBlock({ block, blockIndex, allBlocks, onBlocksChange, saving }: EditableBlockProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(block.text);

  const isRubric = block.speaker === "rubric";
  const isAll = block.speaker === "all";
  const attribution = speakerLabel(block.speaker);

  const handleBlur = useCallback(() => {
    if (value === block.text) {
      setEditing(false);
      return;
    }
    const updatedBlocks = allBlocks.map((b, i) =>
      i === blockIndex ? { ...b, text: value } : b
    );
    onBlocksChange(updatedBlocks);
    setEditing(false);
  }, [value, block.text, blockIndex, allBlocks, onBlocksChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setValue(block.text);
      setEditing(false);
    }
  };

  // Keep local value in sync when block.text changes externally
  useEffect(() => {
    if (value !== block.text) setValue(block.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.text]);

  return (
    <div className="relative py-0.5">
      {attribution && !isRubric && (
        <span className="text-xs text-muted-foreground font-mono mr-2 select-none">
          {attribution}
        </span>
      )}
      {editing ? (
        <textarea
          autoFocus
          className="w-full text-sm border border-primary bg-background p-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary font-serif"
          rows={Math.max(2, Math.ceil(value.length / 80))}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          onClick={() => !saving && setEditing(true)}
          className={`cursor-text text-sm leading-relaxed inline-block w-full hover:bg-primary/5 transition-colors rounded-sm px-0.5 ${
            isRubric ? "italic text-muted-foreground" : ""
          } ${isAll ? "font-semibold" : ""} ${saving ? "cursor-not-allowed opacity-70" : ""}`}
          title={saving ? "Saving…" : "Click to edit"}
        >
          {block.text}
          {saving && (
            <Loader2 className="inline ml-1 h-3 w-3 animate-spin text-muted-foreground" strokeWidth={1.5} />
          )}
        </span>
      )}
    </div>
  );
}

interface SectionPreviewProps {
  section: ResolvedDbSection;
  rawSection: RawServiceSection | undefined;
  onTextOverrideChange: (sectionId: string, blocks: LiturgicalTextBlock[] | null) => void;
  savingSectionId: string | null;
  savedSectionId: string | null;
  saveErrorSectionId: string | null;
}

function SectionPreview({ section, rawSection, onTextOverrideChange, savingSectionId, savedSectionId, saveErrorSectionId }: SectionPreviewProps) {
  const hasOverride = !!(rawSection?.textOverride && rawSection.textOverride.length > 0);
  const isSaving = savingSectionId === section.id;
  const isSaved = savedSectionId === section.id;
  const hasError = saveErrorSectionId === section.id;

  const handleBlocksChange = useCallback((newBlocks: LiturgicalTextBlock[]) => {
    onTextOverrideChange(section.id, newBlocks);
  }, [section.id, onTextOverrideChange]);

  const handleReset = useCallback(() => {
    onTextOverrideChange(section.id, null);
  }, [section.id, onTextOverrideChange]);

  return (
    <div className={`mb-4 ${hasOverride ? "border-l-2 border-primary pl-3" : ""}`}>
      <h3 className="font-heading text-base font-semibold mb-1 text-foreground">
        {section.title}
      </h3>

      {section.reading && (
        <div className="text-sm text-muted-foreground italic mb-1">
          {section.reading.reference}
          {section.reading.text && (
            <p className="mt-1 text-foreground not-italic leading-relaxed">
              {section.reading.text}
            </p>
          )}
        </div>
      )}

      {section.musicSlot && (
        <div className="text-sm text-muted-foreground">
          {section.musicSlot.label}:{" "}
          <span className="text-foreground">{section.musicSlot.value}</span>
          {section.musicSlot.hymn && (
            <span className="ml-2 font-mono text-xs">
              {section.musicSlot.hymn.book} {section.musicSlot.hymn.number}
            </span>
          )}
        </div>
      )}

      {section.blocks.length > 0 && (
        <div className="space-y-0.5">
          {section.blocks.map((block, i) => (
            <EditableBlock
              key={i}
              block={block}
              blockIndex={i}
              allBlocks={section.blocks}
              onBlocksChange={handleBlocksChange}
              saving={isSaving}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1">
        {hasOverride && (
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="text-xs text-primary underline hover:no-underline disabled:opacity-50"
          >
            Reset to default
          </button>
        )}
        {isSaved && (
          <span className="flex items-center gap-0.5 text-xs text-green-600">
            <Check className="h-3 w-3" strokeWidth={2} />
            Saved
          </span>
        )}
        {hasError && (
          <span className="text-xs text-destructive">Failed to save</span>
        )}
      </div>
    </div>
  );
}

export function BookletPreview({ churchId, serviceId, mode = "booklet", isVisible = true }: BookletPreviewProps) {
  const { sections: contextSections } = useServiceEditor();

  const [data, setData] = useState<SheetData | null>(null);
  const [resolvedSections, setResolvedSections] = useState<ResolvedDbSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [savedSectionId, setSavedSectionId] = useState<string | null>(null);
  const [saveErrorSectionId, setSaveErrorSectionId] = useState<string | null>(null);

  // Use context sections as rawSections source (cast to RawServiceSection shape)
  const rawSections: RawServiceSection[] = contextSections.map((s) => ({
    id: s.id,
    serviceId: serviceId,
    sectionKey: s.sectionKey,
    title: s.title,
    majorSection: s.majorSection,
    positionOrder: s.positionOrder,
    liturgicalTextId: s.liturgicalTextId,
    textOverride: s.textOverride as LiturgicalTextBlock[] | null,
    musicSlotId: s.musicSlotId,
    musicSlotType: s.musicSlotType,
    placeholderType: s.placeholderType,
    placeholderValue: s.placeholderValue,
    visible: s.visible,
  }));

  // Track the latest raw sections for saving (kept in ref so save callbacks see current value)
  const rawSectionsRef = useRef<RawServiceSection[]>(rawSections);
  useEffect(() => {
    rawSectionsRef.current = rawSections;
  });

  useEffect(() => {
    if (!isVisible) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Load sheet data only (sections come from context)
        const sheetRes = await fetch(
          `/api/churches/${churchId}/services/${serviceId}/sheet?format=json&mode=${mode}`
        );

        if (!sheetRes.ok) {
          setError("Failed to load preview data");
          setLoading(false);
          return;
        }

        const json: SheetData = await sheetRes.json();
        setData(json);

        if (json.mode === "booklet" && json.resolvedDbSections) {
          setResolvedSections(json.resolvedDbSections);
        }
      } catch {
        setError("Network error loading preview");
      }
      setLoading(false);
    }
    load();
  }, [churchId, serviceId, mode, isVisible]);

  const handleTextOverrideChange = useCallback(async (
    sectionId: string,
    blocks: LiturgicalTextBlock[] | null
  ) => {
    setSavingSectionId(sectionId);
    setSavedSectionId(null);
    setSaveErrorSectionId(null);
    try {
      // Use the granular PATCH endpoint for the individual section
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textOverride: blocks }),
        }
      );

      if (!res.ok) {
        setSaveErrorSectionId(sectionId);
      } else {
        // Refresh sheet data to get re-resolved blocks
        const sheetRes = await fetch(
          `/api/churches/${churchId}/services/${serviceId}/sheet?format=json&mode=${mode}`
        );
        if (sheetRes.ok) {
          const json: SheetData = await sheetRes.json();
          setData(json);
          if (json.mode === "booklet" && json.resolvedDbSections) {
            setResolvedSections(json.resolvedDbSections);
          }
        }

        setSavedSectionId(sectionId);
        setTimeout(() => setSavedSectionId(null), 2000);
      }
    } catch {
      setSaveErrorSectionId(sectionId);
    }
    setSavingSectionId(null);
  }, [churchId, serviceId, mode]);

  const handleExport = (format: "pdf" | "docx") => {
    const url = `/api/churches/${churchId}/services/${serviceId}/sheet?format=${format}&mode=${mode}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
        Loading preview…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-destructive text-sm">
        {error ?? "No data available"}
      </div>
    );
  }

  const renderedMajorSections = new Set<string>();

  return (
    <div className="border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-heading font-semibold text-muted-foreground flex-1">
          Preview &amp; Edit
        </span>
        <button
          onClick={() => handleExport("pdf")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm"
        >
          <FileDown className="h-3 w-3" strokeWidth={1.5} />
          Export PDF
        </button>
        <button
          onClick={() => handleExport("docx")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm"
        >
          <FileText className="h-3 w-3" strokeWidth={1.5} />
          Export DOCX
        </button>
      </div>

      {/* Preview content */}
      <div className="p-6 max-w-2xl mx-auto font-serif">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b border-border">
          <h1 className="font-heading text-2xl font-semibold">{data.churchName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.liturgicalName}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {data.date}
            {data.time ? ` · ${data.time}` : ""}
          </p>
        </div>

        {/* Sections (booklet mode) */}
        {resolvedSections.length > 0 ? (
          <div>
            {resolvedSections.map((section) => {
              const showDivider =
                section.majorSection &&
                !renderedMajorSections.has(section.majorSection);

              if (showDivider && section.majorSection) {
                renderedMajorSections.add(section.majorSection);
              }

              const rawSection = rawSections.find((r) => r.id === section.id);

              return (
                <div key={section.id}>
                  {showDivider && section.majorSection && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-widest px-1">
                        {section.majorSection}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <SectionPreview
                    section={section}
                    rawSection={rawSection}
                    onTextOverrideChange={handleTextOverrideChange}
                    savingSectionId={savingSectionId}
                    savedSectionId={savedSectionId}
                    saveErrorSectionId={saveErrorSectionId}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p>No section content available for preview.</p>
            <p className="text-xs mt-1">
              Add sections to the service to see them here.
            </p>
          </div>
        )}

        {/* Music summary for summary mode */}
        {data.mode === "summary" && data.musicSlots.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h2 className="font-heading text-lg font-semibold mb-3">Music</h2>
            <div className="space-y-1">
              {data.musicSlots.map((slot, i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <span className="text-muted-foreground w-32 flex-shrink-0">
                    {slot.label}
                  </span>
                  <span>{slot.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center pb-3">
        Click any text block to edit. Changes are saved automatically on blur.
      </p>
    </div>
  );
}
