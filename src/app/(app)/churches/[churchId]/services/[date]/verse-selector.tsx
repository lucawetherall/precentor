"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Verse {
  id: string;
  hymnId: string;
  verseNumber: number;
  text: string;
  isChorus: boolean;
}

interface MusicSlot {
  id: string;
  slotType: string;
  positionOrder: number;
  hymnId: string | null;
  anthemId: string | null;
  massSettingId: string | null;
  canticleSettingId: string | null;
  responsesSettingId: string | null;
  freeText: string | null;
  notes: string | null;
  verseCount: number | null;
  selectedVerses: number[] | null;
}

interface VerseSelectorProps {
  hymnId: string;
  musicSlotId: string;
  serviceId: string;
  churchId: string;
  selectedVerses?: number[] | null;
  onSave?: (selectedVerses: number[]) => void;
}

export function VerseSelector({
  hymnId,
  musicSlotId,
  serviceId,
  churchId,
  selectedVerses: initialSelected,
  onSave,
}: VerseSelectorProps) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialSelected ?? [])
  );

  useEffect(() => {
    if (!open) return;
    if (verses.length > 0) return;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/hymns/${hymnId}/verses`);
        const data = await r.json();
        if (Array.isArray(data)) setVerses(data);
      } catch {
        addToast("Failed to load verses", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, hymnId, verses.length, addToast]);

  const handleToggle = (verseNumber: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(verseNumber)) {
        next.delete(verseNumber);
      } else {
        next.add(verseNumber);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/slots`
      );
      if (!res.ok) {
        addToast("Failed to load slots", "error");
        return;
      }
      const slots: MusicSlot[] = await res.json();

      const selectedArr = Array.from(selected).sort((a, b) => a - b);
      const updated = slots.map((s) =>
        s.id === musicSlotId ? { ...s, selectedVerses: selectedArr } : s
      );

      const putRes = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/slots`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots: updated }),
        }
      );

      if (putRes.ok) {
        onSave?.(selectedArr);
        setOpen(false);
      } else {
        addToast("Failed to save verse selection", "error");
      }
    } catch {
      addToast("Network error saving verses", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Reset selection to initial on cancel
      setSelected(new Set(initialSelected ?? []));
    }
    setOpen(v);
  };

  const toggleableVerses = verses.filter((v) => !v.isChorus);
  const allToggleableSelected =
    toggleableVerses.length > 0 &&
    toggleableVerses.every((v) => selected.has(v.verseNumber));

  const handleSelectAll = () => {
    if (allToggleableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(toggleableVerses.map((v) => v.verseNumber)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
        {initialSelected && initialSelected.length > 0
          ? `vv. ${initialSelected.join(", ")}`
          : "Select verses…"}
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Select Verses</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
          </div>
        ) : verses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No verses available.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {/* Select all toggle */}
            {toggleableVerses.length > 1 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors mb-2"
              >
                {allToggleableSelected ? "Deselect all" : "Select all"}
              </button>
            )}

            {verses.map((verse) => {
              const isChorus = verse.isChorus;
              const isSelected = selected.has(verse.verseNumber);

              return (
                <div
                  key={verse.id}
                  className={`flex items-start gap-2.5 px-3 py-2 rounded-sm border transition-colors ${
                    isChorus
                      ? "border-transparent bg-muted/50 cursor-default"
                      : isSelected
                      ? "border-primary bg-accent cursor-pointer"
                      : "border-border bg-card hover:border-primary/50 cursor-pointer"
                  }`}
                  onClick={isChorus ? undefined : () => handleToggle(verse.verseNumber)}
                  role={isChorus ? undefined : "checkbox"}
                  aria-checked={isChorus ? undefined : isSelected}
                  tabIndex={isChorus ? -1 : 0}
                  onKeyDown={
                    isChorus
                      ? undefined
                      : (e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handleToggle(verse.verseNumber);
                          }
                        }
                  }
                >
                  {/* Checkbox indicator */}
                  <div className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                    {isChorus ? (
                      <span className="text-xs text-muted-foreground font-body italic">R</span>
                    ) : isSelected ? (
                      <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                    ) : (
                      <div className="w-3.5 h-3.5 border border-border rounded-sm" />
                    )}
                  </div>

                  {/* Verse content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-heading font-semibold text-muted-foreground">
                        {isChorus ? "Refrain" : `v. ${verse.verseNumber}`}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground line-clamp-2 font-body">
                      {verse.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-sm"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            ) : (
              <Check className="h-3 w-3" strokeWidth={2} />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
