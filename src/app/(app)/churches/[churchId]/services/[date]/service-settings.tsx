"use client";

import { useState } from "react";
import { Loader2, Save, Check } from "lucide-react";

type SheetMode = "summary" | "booklet";

const EUCHARIST_TYPES = new Set(["SUNG_EUCHARIST", "SAID_EUCHARIST"]);

interface ServiceSettingsProps {
  serviceId: string;
  serviceType: string;
  churchId: string;
  initialSettings: {
    sheetMode: string;
    eucharisticPrayer: string | null;
    includeReadingText: boolean;
  };
}

export function ServiceSettings({
  serviceId,
  serviceType,
  churchId,
  initialSettings,
}: ServiceSettingsProps) {
  const [sheetMode, setSheetMode] = useState<SheetMode>(
    initialSettings.sheetMode === "booklet" ? "booklet" : "summary"
  );
  const [eucharisticPrayer, setEucharisticPrayer] = useState<string>(
    initialSettings.eucharisticPrayer ?? ""
  );
  const [includeReadingText, setIncludeReadingText] = useState(
    initialSettings.includeReadingText
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEucharist = EUCHARIST_TYPES.has(serviceType);
  const showBookletOptions = sheetMode === "booklet";

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = { sheetMode };
      if (isEucharist) {
        body.eucharisticPrayer = eucharisticPrayer || null;
      }
      if (showBookletOptions) {
        body.includeReadingText = includeReadingText;
      }

      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error ?? "Failed to save settings");
      }
    } catch {
      setSaveError("Network error — could not save");
    }
    setSaving(false);
  };

  return (
    <div className="border border-border bg-card p-4 mt-4">
      <h3 className="text-sm font-heading font-semibold mb-3">
        Service Sheet Settings
      </h3>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Mode:</span>
          <select
            value={sheetMode}
            onChange={(e) => setSheetMode(e.target.value as SheetMode)}
            className="px-2 py-1 text-xs border border-border bg-background"
          >
            <option value="summary">Summary</option>
            <option value="booklet">Booklet</option>
          </select>
        </label>

        {showBookletOptions && isEucharist && (
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Eucharistic Prayer:</span>
            <select
              value={eucharisticPrayer}
              onChange={(e) => setEucharisticPrayer(e.target.value)}
              className="px-2 py-1 text-xs border border-border bg-background"
            >
              <option value="">Not set</option>
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((p) => (
                <option key={p} value={p}>
                  Prayer {p}
                </option>
              ))}
            </select>
          </label>
        )}

        {showBookletOptions && (
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={includeReadingText}
              onChange={(e) => setIncludeReadingText(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-muted-foreground">
              Include reading text
            </span>
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" strokeWidth={2} />
              Saved
            </span>
          )}
          {saveError && (
            <span className="text-xs text-destructive">{saveError}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            ) : (
              <Save className="h-3 w-3" strokeWidth={1.5} />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
