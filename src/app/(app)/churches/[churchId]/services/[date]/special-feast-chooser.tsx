"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Star } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useServiceEditor } from "./service-editor-context";
import type { AvailableSpecial } from "./service-planner";

interface SpecialFeastChooserProps {
  /** The regular liturgical-day name, shown as the "no special" option. */
  dayName: string;
  /** Transferred Festivals / alternate provisions available for this Sunday. */
  availableSpecials: AvailableSpecial[];
}

/**
 * Lets an editor keep a transferred Festival (or alternate provision) on this
 * Sunday's service. Switching swaps the service's title, colour, collect and
 * readings; "Regular" reverts. Readings are resolved server-side, so a change
 * triggers a refresh to re-render them.
 */
export function SpecialFeastChooser({ dayName, availableSpecials }: SpecialFeastChooserProps) {
  const { settings, updateSettings } = useServiceEditor();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (availableSpecials.length === 0) return null;

  const current = settings.specialFeastKey;
  const currentNote = current ? availableSpecials.find((s) => s.key === current)?.note : null;

  const handleChange = async (value: string) => {
    const next = value === "" ? null : value;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateSettings({ specialFeastKey: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Title, colour, collect and readings are resolved on the server.
      router.refresh();
    } catch {
      setSaveError("Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Star className="h-3 w-3" strokeWidth={1.5} />
        Special service:
      </span>
      <Select
        value={current ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="w-56 text-xs rounded-sm h-7"
        aria-label="Transferred special service"
      >
        <option value="">Regular: {dayName}</option>
        {availableSpecials.map((s) => (
          <option key={s.key} value={s.key}>
            {s.name}
          </option>
        ))}
      </Select>
      {saving && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
      )}
      {saved && !saving && (
        <span className="flex items-center gap-0.5 text-success flex-shrink-0">
          <Check className="h-3 w-3" strokeWidth={2} />
          Saved
        </span>
      )}
      {saveError && <span className="text-destructive flex-shrink-0">{saveError}</span>}
      {currentNote && (
        <span className="basis-full text-muted-foreground italic">{currentNote}</span>
      )}
    </div>
  );
}
