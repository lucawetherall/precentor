"use client";

import { useState, useEffect } from "react";
import { MUSIC_SLOT_LABELS, EUCHARIST_SLOTS, EVENSONG_SLOTS } from "@/types";
import type { MusicSlotType } from "@/types";
import { Sparkles, Save, Loader2 } from "lucide-react";

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
}

interface Suggestion {
  id: string;
  title: string;
  reason: string;
}

export function MusicSlotEditor({
  serviceId,
  serviceType,
  churchId,
}: {
  serviceId: string;
  serviceType: string;
  churchId: string;
}) {
  const [slots, setSlots] = useState<MusicSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<number, Suggestion[]>>({});
  const [suggestingFor, setSuggestingFor] = useState<number | null>(null);

  // Determine template slots based on service type
  const templateSlots: MusicSlotType[] =
    serviceType === "SUNG_EUCHARIST" || serviceType === "SAID_EUCHARIST"
      ? EUCHARIST_SLOTS
      : serviceType === "CHORAL_EVENSONG"
      ? EVENSONG_SLOTS
      : ["HYMN", "HYMN", "HYMN", "HYMN", "ORGAN_VOLUNTARY_POST"];

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch(`/api/churches/${churchId}/services/${serviceId}/slots`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setSlots(data);
          } else {
            // Create default template
            setSlots(
              templateSlots.map((type, i) => ({
                id: "",
                slotType: type,
                positionOrder: i,
                hymnId: null,
                anthemId: null,
                massSettingId: null,
                canticleSettingId: null,
                responsesSettingId: null,
                freeText: null,
                notes: null,
              }))
            );
          }
        }
      } catch {
        // Use template
        setSlots(
          templateSlots.map((type, i) => ({
            id: "",
            slotType: type,
            positionOrder: i,
            hymnId: null,
            anthemId: null,
            massSettingId: null,
            canticleSettingId: null,
            responsesSettingId: null,
            freeText: null,
            notes: null,
          }))
        );
      }
      setLoading(false);
    }
    loadSlots();
  }, [serviceId]);

  const handleSlotChange = (index: number, field: string, value: string) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, [field]: value || null } : slot
      )
    );
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/churches/${churchId}/services/${serviceId}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Failed to save music slots");
      }
    } catch {
      setSaveError("Network error — could not save");
    }
    setSaving(false);
  };

  const handleSuggest = async (index: number) => {
    setSuggestingFor(index);
    try {
      const res = await fetch("/api/ai/suggest-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          slotType: slots[index].slotType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => ({ ...prev, [index]: data.suggestions }));
      }
    } catch (e) {
      console.error("Suggestion failed:", e);
    }
    setSuggestingFor(null);
  };

  const handleApplySuggestion = (index: number, suggestion: Suggestion) => {
    handleSlotChange(index, "freeText", suggestion.title);
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {slots.map((slot, i) => {
          const label = MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] || slot.slotType;
          const slotSuggestions = suggestions[i];

          return (
            <div key={i} className="border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}</span>
                <span className="text-sm font-heading font-semibold w-40 flex-shrink-0">{label}</span>
                <input
                  type="text"
                  value={slot.freeText || ""}
                  onChange={(e) => handleSlotChange(i, "freeText", e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className="flex-1 px-2 py-1 text-sm border border-border bg-white focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={slot.notes || ""}
                  onChange={(e) => handleSlotChange(i, "notes", e.target.value)}
                  placeholder="Notes"
                  className="w-32 px-2 py-1 text-sm border border-border bg-white focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => handleSuggest(i)}
                  disabled={suggestingFor === i}
                  className="p-1.5 text-primary hover:bg-accent transition-colors disabled:opacity-50"
                  title="AI Suggest"
                >
                  {suggestingFor === i ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {/* Suggestions popover */}
              {slotSuggestions && slotSuggestions.length > 0 && (
                <div className="mt-2 ml-9 border border-border bg-background p-2 space-y-1">
                  <p className="text-xs text-muted-foreground mb-1">AI Suggestions:</p>
                  {slotSuggestions.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => handleApplySuggestion(i, s)}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="font-body">{s.title}</span>
                      <span className="block text-xs text-muted-foreground">{s.reason}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saveError && (
        <p className="mt-2 text-sm text-destructive">{saveError}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Save className="h-4 w-4" strokeWidth={1.5} />}
          Save Music
        </button>
      </div>
    </div>
  );
}
