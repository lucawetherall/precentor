"use client";

import { useState, useEffect } from "react";
import { Plus, Music, BookOpen, FileText, AlignLeft, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useServiceEditor } from "./service-editor-context";

interface LiturgicalText {
  id: string;
  key: string;
  title: string;
  rite: string;
  category: string;
}

type SectionType = "hymn" | "liturgical-text" | "reading" | "custom-text";

interface AddSectionPickerProps {
  churchId: string;
}

const SECTION_TYPES: {
  id: SectionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}[] = [
  {
    id: "hymn",
    label: "Hymn",
    description: "A hymn or song slot",
    icon: <Music className="h-5 w-5" strokeWidth={1.5} />,
    colorClass: "text-primary",
  },
  {
    id: "liturgical-text",
    label: "Liturgical Text",
    description: "A fixed liturgical text from the database",
    icon: <BookOpen className="h-5 w-5" strokeWidth={1.5} />,
    colorClass: "text-blue-700",
  },
  {
    id: "reading",
    label: "Reading",
    description: "A scripture reading",
    icon: <FileText className="h-5 w-5" strokeWidth={1.5} />,
    colorClass: "text-warning-foreground",
  },
  {
    id: "custom-text",
    label: "Custom Text",
    description: "Free-form custom text content",
    icon: <AlignLeft className="h-5 w-5" strokeWidth={1.5} />,
    colorClass: "text-slate-600",
  },
];

export function AddSectionPicker({ churchId }: AddSectionPickerProps) {
  const { sections, addSection } = useServiceEditor();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const [liturgicalTexts, setLiturgicalTexts] = useState<LiturgicalText[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [textSearch, setTextSearch] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [readingTitle, setReadingTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedType === "liturgical-text" && liturgicalTexts.length === 0) {
      setLoadingTexts(true);
      fetch(`/api/churches/${churchId}/liturgical-texts`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setLiturgicalTexts(data);
        })
        .catch(() => {})
        .finally(() => setLoadingTexts(false));
    }
  }, [selectedType, churchId, liturgicalTexts.length]);

  const filteredTexts = liturgicalTexts.filter(
    (t) =>
      t.title.toLowerCase().includes(textSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(textSearch.toLowerCase())
  );

  const handleReset = () => {
    setSelectedType(null);
    setTextSearch("");
    setCustomTitle("");
    setReadingTitle("");
  };

  const handleClose = () => {
    setOpen(false);
    handleReset();
  };

  const saveSection = async (sectionData: {
    sectionKey: string;
    title: string;
    musicSlotType?: string | null;
    liturgicalTextId?: string | null;
    placeholderType?: string | null;
    placeholderValue?: string | null;
    textOverride?: { speaker: string; text: string }[] | null;
  }) => {
    setSaving(true);
    try {
      // Compute append position from current max to handle non-contiguous orders after deletes
      const nextPositionOrder = sections.reduce((m, s) => Math.max(m, s.positionOrder), 0) + 1
      await addSection({
        sectionKey: sectionData.sectionKey,
        title: sectionData.title,
        majorSection: null,
        positionOrder: nextPositionOrder,
        liturgicalTextId: sectionData.liturgicalTextId ?? null,
        textOverride: sectionData.textOverride ?? null,
        musicSlotId: null,
        musicSlotType: sectionData.musicSlotType ?? null,
        placeholderType: sectionData.placeholderType ?? null,
        placeholderValue: sectionData.placeholderValue ?? null,
        visible: true,
        notes: null,
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddHymn = () =>
    saveSection({
      sectionKey: "hymn",
      title: "Hymn",
      placeholderType: "hymn",
    });

  const handleAddLiturgicalText = (text: LiturgicalText) =>
    saveSection({
      sectionKey: text.key,
      title: text.title,
      liturgicalTextId: text.id,
    });

  const handleAddReading = () => {
    const title = readingTitle.trim() || "Reading";
    saveSection({
      sectionKey: "reading-custom",
      title,
      placeholderType: "reading-custom",
    });
  };

  const handleAddCustomText = () => {
    const title = customTitle.trim() || "Custom Text";
    saveSection({
      sectionKey: "custom-text",
      title,
      textOverride: [{ speaker: "", text: "" }],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger
        className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors w-full justify-center mt-2 rounded-sm"
        aria-label="Add section"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Add section
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {selectedType ? "Add Section" : "Choose Section Type"}
          </DialogTitle>
        </DialogHeader>

        {/* Type picker */}
        {!selectedType && (
          <div className="grid grid-cols-2 gap-2">
            {SECTION_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="flex flex-col items-center gap-2 p-4 border border-border rounded-sm hover:border-primary hover:bg-accent transition-colors text-center"
              >
                <span className={type.colorClass}>{type.icon}</span>
                <span className="text-sm font-heading font-semibold">
                  {type.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Hymn */}
        {selectedType === "hymn" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adds a hymn slot to the running order. You can assign a specific hymn in the next step.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-sm"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleAddHymn}
                disabled={saving}
                className="rounded-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                )}
                Add Hymn
              </Button>
            </div>
          </div>
        )}

        {/* Liturgical text picker */}
        {selectedType === "liturgical-text" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="search"
                placeholder="Search liturgical texts…"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border bg-background focus:border-primary focus:outline-none rounded-sm"
                autoFocus
              />
            </div>
            {loadingTexts ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
              </div>
            ) : filteredTexts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {liturgicalTexts.length === 0
                  ? "No liturgical texts found"
                  : "No texts match your search"}
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-border divide-y divide-border rounded-sm">
                {filteredTexts.map((text) => (
                  <button
                    key={text.id}
                    onClick={() => handleAddLiturgicalText(text)}
                    disabled={saving}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="text-sm font-heading font-semibold">
                      {text.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {text.category} · {text.rite}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-sm"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Reading */}
        {selectedType === "reading" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="reading-title" className="block text-xs text-muted-foreground mb-1">
                Reading title (optional)
              </label>
              <input
                id="reading-title"
                type="text"
                value={readingTitle}
                onChange={(e) => setReadingTitle(e.target.value)}
                placeholder="e.g. First Reading, Gospel Reading…"
                className="w-full px-3 py-1.5 text-sm border border-border bg-background focus:border-primary focus:outline-none rounded-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-sm"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleAddReading}
                disabled={saving}
                className="rounded-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                )}
                Add Reading
              </Button>
            </div>
          </div>
        )}

        {/* Custom text */}
        {selectedType === "custom-text" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="custom-title" className="block text-xs text-muted-foreground mb-1">
                Section title
              </label>
              <input
                id="custom-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Announcements, Notices…"
                className="w-full px-3 py-1.5 text-sm border border-border bg-background focus:border-primary focus:outline-none rounded-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="rounded-sm"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleAddCustomText}
                disabled={saving}
                className="rounded-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                )}
                Add Custom Text
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
