"use client";

import { useState } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";

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

interface VerseStepper {
  musicSlotId: string;
  churchId: string;
  serviceId: string;
  hymnId: string;
  currentVerseCount: number;
  totalVerses: number;
}

export function VerseStepper({
  musicSlotId,
  churchId,
  serviceId,
  currentVerseCount,
  totalVerses,
}: VerseStepper) {
  const [count, setCount] = useState(
    Math.min(Math.max(currentVerseCount, 1), totalVerses)
  );
  const [saving, setSaving] = useState(false);

  const updateVerseCount = async (newCount: number) => {
    setSaving(true);
    try {
      // Fetch all slots, update the target slot's verseCount, then PUT all back
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/slots`
      );
      if (!res.ok) return;
      const slots: MusicSlot[] = await res.json();

      const updated = slots.map((s) =>
        s.id === musicSlotId ? { ...s, verseCount: newCount } : s
      );

      await fetch(`/api/churches/${churchId}/services/${serviceId}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: updated }),
      });
    } catch {
      // silent — UI already shows the new value
    }
    setSaving(false);
  };

  const handleDecrement = () => {
    if (count <= 1) return;
    const next = count - 1;
    setCount(next);
    updateVerseCount(next);
  };

  const handleIncrement = () => {
    if (count >= totalVerses) return;
    const next = count + 1;
    setCount(next);
    updateVerseCount(next);
  };

  return (
    <div className="flex items-center gap-1.5" aria-label="Verse count">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={count <= 1 || saving}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Fewer verses"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      <span className="text-xs text-muted-foreground tabular-nums min-w-[4rem] text-center">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin inline" strokeWidth={1.5} />
        ) : (
          `${count} of ${totalVerses} v.`
        )}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={count >= totalVerses || saving}
        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="More verses"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
