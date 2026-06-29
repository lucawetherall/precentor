"use client";

import { useServiceEditor } from "./service-editor-context";
import { EucharisticPrayerBrowser } from "./eucharistic-prayer-browser";
import { SpecialFeastChooser } from "./special-feast-chooser";
import type { AvailableSpecial } from "./service-planner";

const EUCHARIST_TYPES = new Set(["SUNG_EUCHARIST", "SAID_EUCHARIST"]);

interface ServiceSettingsProps {
  serviceType: string;
  dayName: string;
  availableSpecials: AvailableSpecial[];
}

export function ServiceSettings({
  serviceType,
  dayName,
  availableSpecials,
}: ServiceSettingsProps) {
  const { settings, updateSettings, debouncedUpdateSettings } =
    useServiceEditor();

  const isEucharist = EUCHARIST_TYPES.has(serviceType);
  const showBookletOptions = settings.sheetMode === "booklet";

  return (
    <div className="border border-border bg-card p-4 mt-4">
      <h3 className="text-sm font-heading font-semibold mb-3">
        Service Sheet Settings
      </h3>

      {availableSpecials.length > 0 && (
        <div className="mb-4 pb-4 border-b border-border">
          <SpecialFeastChooser dayName={dayName} availableSpecials={availableSpecials} />
          <p className="mt-1 text-xs text-muted-foreground">
            A Festival falling near this Sunday can be kept here instead — its title and readings replace the regular ones.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Mode:</span>
          <select
            value={settings.sheetMode}
            onChange={(e) =>
              updateSettings({ sheetMode: e.target.value })
            }
            className="px-2 py-1 text-xs border border-border bg-background"
          >
            <option value="summary">Summary</option>
            <option value="booklet">Booklet</option>
          </select>
        </label>

        {showBookletOptions && isEucharist && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Eucharistic Prayer:</span>
            <EucharisticPrayerBrowser />
          </div>
        )}

        {showBookletOptions && (
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeReadingText}
              onChange={(e) =>
                updateSettings({ includeReadingText: e.target.checked })
              }
              className="accent-primary"
            />
            <span className="text-muted-foreground">
              Include reading text
            </span>
          </label>
        )}

        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Default Mass Setting:</span>
          <input
            type="text"
            value={settings.defaultMassSettingId ?? ""}
            onChange={(e) =>
              debouncedUpdateSettings({
                defaultMassSettingId: e.target.value || null,
              })
            }
            placeholder="Mass setting ID"
            className="px-2 py-1 text-xs border border-border bg-background w-48"
          />
        </label>
      </div>
    </div>
  );
}
