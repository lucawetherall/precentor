"use client";

import { useState } from "react";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { Button } from "@/components/ui/button";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

interface ServicePattern {
  id: string;
  churchId: string;
  dayOfWeek: number;
  serviceType: string;
  time: string | null;
  enabled: boolean;
}

interface Props {
  churchId: string;
  initialPatterns: ServicePattern[];
}

interface AddFormState {
  dayOfWeek: number;
  serviceType: ServiceType;
  time: string;
  enabled: boolean;
}

export function ServicePatternsClient({ churchId, initialPatterns }: Props) {
  const [patterns, setPatterns] = useState<ServicePattern[]>(initialPatterns);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({
    dayOfWeek: 0,
    serviceType: "SUNG_EUCHARIST",
    time: "10:00",
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleToggleEnabled(pattern: ServicePattern) {
    const updated = { ...pattern, enabled: !pattern.enabled };
    setPatterns((prev) => prev.map((p) => (p.id === pattern.id ? updated : p)));

    const res = await fetch(
      `/api/churches/${churchId}/service-patterns/${pattern.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !pattern.enabled }),
      },
    );

    if (!res.ok) {
      // Revert on error
      setPatterns((prev) => prev.map((p) => (p.id === pattern.id ? pattern : p)));
      showToast("Failed to update pattern.");
    }
  }

  async function handleDelete(patternId: string) {
    const res = await fetch(
      `/api/churches/${churchId}/service-patterns/${patternId}`,
      { method: "DELETE" },
    );

    if (res.ok) {
      setPatterns((prev) => prev.filter((p) => p.id !== patternId));
    } else {
      showToast("Failed to delete pattern.");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/churches/${churchId}/service-patterns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: addForm.dayOfWeek,
        serviceType: addForm.serviceType,
        time: addForm.time || null,
        enabled: addForm.enabled,
      }),
    });

    if (res.ok) {
      const created: ServicePattern = await res.json();
      setPatterns((prev) => [...prev, created]);
      setShowAddForm(false);
      setAddForm({
        dayOfWeek: 0,
        serviceType: "SUNG_EUCHARIST",
        time: "10:00",
        enabled: true,
      });
    } else {
      const data = await res.json().catch(() => ({}));
      showToast((data as { error?: string }).error ?? "Failed to add pattern.");
    }

    setSaving(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch(
      `/api/churches/${churchId}/services/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: 3 }),
      },
    );

    if (res.ok) {
      const data: { created: number } = await res.json();
      showToast(`Generated ${data.created} new service${data.created !== 1 ? "s" : ""}.`);
    } else {
      showToast("Failed to generate services.");
    }

    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 bg-foreground text-background text-sm px-4 py-2 shadow"
        >
          {toast}
        </div>
      )}

      {/* Patterns list */}
      {patterns.length === 0 && !showAddForm ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No service patterns configured yet.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center justify-between px-4 py-3 bg-card"
            >
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium w-24">
                  {DAY_NAMES[pattern.dayOfWeek]}
                </span>
                <span className="text-muted-foreground w-40">
                  {SERVICE_TYPE_LABELS[pattern.serviceType as ServiceType] ??
                    pattern.serviceType}
                </span>
                <span className="text-muted-foreground w-16">
                  {pattern.time ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pattern.enabled}
                    onChange={() => handleToggleEnabled(pattern)}
                    className="accent-primary"
                  />
                  Enabled
                </label>
                <button
                  onClick={() => handleDelete(pattern.id)}
                  className="text-sm text-destructive hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add pattern form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="border border-border bg-card p-4 space-y-4"
        >
          <h2 className="text-sm font-medium">New Pattern</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label htmlFor="ap-day" className="text-xs text-muted-foreground">
                Day of Week
              </label>
              <select
                id="ap-day"
                value={addForm.dayOfWeek}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    dayOfWeek: Number(e.target.value),
                  }))
                }
                className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DAY_NAMES.map((day, i) => (
                  <option key={day} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="ap-type" className="text-xs text-muted-foreground">
                Service Type
              </label>
              <select
                id="ap-type"
                value={addForm.serviceType}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    serviceType: e.target.value as ServiceType,
                  }))
                }
                className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {SERVICE_TYPE_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="ap-time" className="text-xs text-muted-foreground">
                Time
              </label>
              <input
                id="ap-time"
                type="time"
                value={addForm.time}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, time: e.target.value }))
                }
                className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer pb-1">
              <input
                type="checkbox"
                checked={addForm.enabled}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, enabled: e.target.checked }))
                }
                className="accent-primary"
              />
              Enabled
            </label>

            <Button type="submit" disabled={saving} size="sm">
              {saving ? "Saving..." : "Save"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!showAddForm && (
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            Add pattern
          </Button>
        )}

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate upcoming services"}
        </Button>
      </div>
    </div>
  );
}
