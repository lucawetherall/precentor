"use client";

import { useState } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";

interface VerseStepperProps {
  slotId: string;
  totalVerses: number;
}

export function VerseStepper({ slotId, totalVerses }: VerseStepperProps) {
  const { musicSlots, updateSlot } = useServiceEditor();
  const slot = musicSlots.get(slotId);

  const currentVerseCount = slot?.verseCount ?? totalVerses;
  const [count, setCount] = useState(
    Math.min(Math.max(currentVerseCount, 1), totalVerses)
  );
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (newCount: number) => {
    setSaving(true);
    try {
      await updateSlot(slotId, { verseCount: newCount });
    } catch {
      // silent — UI already shows the new value
    }
    setSaving(false);
  };

  const handleDecrement = () => {
    if (count <= 1) return;
    const next = count - 1;
    setCount(next);
    handleUpdate(next);
  };

  const handleIncrement = () => {
    if (count >= totalVerses) return;
    const next = count + 1;
    setCount(next);
    handleUpdate(next);
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
