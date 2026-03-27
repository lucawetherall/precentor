"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Collect {
  id: string;
  title: string;
  text: string;
  rite: string;
}

interface CollectChooserProps {
  serviceId: string;
  churchId: string;
  liturgicalDayId: string | null;
  collectId: string | null;
  collectOverride: string | null;
}

type CollectSource = "cw" | "bcp" | "custom";

function detectSource(
  collectId: string | null,
  collectOverride: string | null,
  collects: Collect[]
): CollectSource {
  if (collectOverride) return "custom";
  if (collectId) {
    const found = collects.find((c) => c.id === collectId);
    if (found?.rite === "BCP") return "bcp";
    return "cw";
  }
  return "cw";
}

export function CollectChooser({
  serviceId,
  churchId,
  liturgicalDayId,
  collectId: initialCollectId,
  collectOverride: initialCollectOverride,
}: CollectChooserProps) {
  const [collects, setCollects] = useState<Collect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [source, setSource] = useState<CollectSource>("cw");
  const [selectedId, setSelectedId] = useState<string | null>(initialCollectId);
  const [customText, setCustomText] = useState<string>(initialCollectOverride ?? "");

  useEffect(() => {
    async function loadCollects() {
      setLoading(true);
      try {
        const qs = liturgicalDayId ? `?liturgicalDayId=${liturgicalDayId}` : "";
        const res = await fetch(`/api/churches/${churchId}/collects${qs}`);
        if (res.ok) {
          const data: Collect[] = await res.json();
          setCollects(data);
          setSource(detectSource(initialCollectId, initialCollectOverride, data));
        }
      } catch {
        // leave empty
      }
      setLoading(false);
    }
    loadCollects();
  }, [churchId, liturgicalDayId, initialCollectId, initialCollectOverride]);

  const patch = async (updates: Record<string, unknown>) => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch(`/api/churches/${churchId}/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error ?? "Failed to save");
      }
    } catch {
      setSaveError("Network error — could not save");
    }
    setSaving(false);
  };

  const handleSourceChange = (newSource: CollectSource) => {
    setSource(newSource);
    if (newSource === "custom") {
      // Clear collectId, keep or init override
      setSelectedId(null);
      patch({ collectId: null, collectOverride: customText || null });
    } else {
      // Pick first collect of that rite, clear override
      setCustomText("");
      const riteFilter = newSource === "bcp" ? "BCP" : "CW";
      const first = collects.find((c) => c.rite === riteFilter || (newSource === "cw" && c.rite === "COMMON"));
      const id = first?.id ?? null;
      setSelectedId(id);
      patch({ collectId: id, collectOverride: null });
    }
  };

  const handleCollectSelect = (id: string) => {
    setSelectedId(id);
    patch({ collectId: id, collectOverride: null });
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
  };

  const handleCustomBlur = () => {
    patch({ collectId: null, collectOverride: customText || null });
  };

  const cwCollects = collects.filter((c) => c.rite === "CW" || c.rite === "COMMON");
  const bcpCollects = collects.filter((c) => c.rite === "BCP");
  const visibleCollects = source === "bcp" ? bcpCollects : cwCollects;

  const previewCollect = source !== "custom"
    ? collects.find((c) => c.id === selectedId)
    : null;
  const previewText = source === "custom" ? customText : previewCollect?.text;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Source selector */}
        <Select
          value={source}
          onChange={(e) => handleSourceChange(e.target.value as CollectSource)}
          disabled={loading || saving}
          className="w-32 text-xs rounded-sm h-7"
          aria-label="Collect source"
        >
          <option value="cw">CW</option>
          <option value="bcp">BCP</option>
          <option value="custom">Custom</option>
        </Select>

        {/* Collect picker (when CW or BCP) */}
        {source !== "custom" && (
          <Select
            value={selectedId ?? ""}
            onChange={(e) => handleCollectSelect(e.target.value)}
            disabled={loading || saving || visibleCollects.length === 0}
            className="flex-1 text-xs rounded-sm h-7"
            aria-label="Select collect"
          >
            {loading ? (
              <option value="">Loading…</option>
            ) : visibleCollects.length === 0 ? (
              <option value="">No collects available</option>
            ) : (
              visibleCollects.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))
            )}
          </Select>
        )}

        {saving && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
        )}
        {saved && !saving && (
          <span className="flex items-center gap-0.5 text-xs text-green-600 flex-shrink-0">
            <Check className="h-3 w-3" strokeWidth={2} />
            Saved
          </span>
        )}
      </div>
      {saveError && (
        <p className="text-xs text-destructive">{saveError}</p>
      )}

      {/* Custom textarea */}
      {source === "custom" && (
        <Textarea
          value={customText}
          onChange={(e) => handleCustomChange(e.target.value)}
          onBlur={handleCustomBlur}
          placeholder="Enter custom collect text…"
          rows={4}
          className="text-sm rounded-sm"
          aria-label="Custom collect text"
        />
      )}

      {/* Preview */}
      {previewText && (
        <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3 italic">
          {previewText}
        </p>
      )}
    </div>
  );
}
