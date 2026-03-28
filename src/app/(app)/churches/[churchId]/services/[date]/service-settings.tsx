"use client";

import { useServiceEditor } from "./service-editor-context";
import { CHOIR_STATUS_LABELS } from "../choir-status-constants";

const EUCHARIST_TYPES = new Set(["SUNG_EUCHARIST", "SAID_EUCHARIST"]);

interface ServiceSettingsProps {
  serviceType: string;
}

export function ServiceSettings({
  serviceType,
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
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Eucharistic Prayer:</span>
            <select
              value={settings.eucharisticPrayer ?? ""}
              onChange={(e) =>
                updateSettings({
                  eucharisticPrayer: e.target.value || null,
                })
              }
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
          <span className="text-muted-foreground">Choir:</span>
          <select
            value={settings.choirStatus}
            onChange={(e) =>
              updateSettings({ choirStatus: e.target.value })
            }
            className="px-2 py-1 text-xs border border-border bg-background"
          >
            {Object.entries(CHOIR_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

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
