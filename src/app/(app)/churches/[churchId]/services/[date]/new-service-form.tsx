"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { Button } from "@/components/ui/button";

export interface Preset {
  id: string;
  name: string;
  serviceType: string;
}

interface Props {
  churchId: string;
  creating: boolean;
  onCreate: (input: { serviceType: ServiceType; time: string; presetId: string | null }) => void;
}

export function NewServiceForm({ churchId, creating, onCreate }: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>("SUNG_EUCHARIST");
  const [time, setTime] = useState("10:00");
  const [presetId, setPresetId] = useState<string>("");
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    fetch(`/api/churches/${churchId}/presets`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPresets(data);
        else if (data?.data && Array.isArray(data.data)) setPresets(data.data);
      })
      .catch(() => {});
  }, [churchId]);

  return (
    <div className="ml-auto flex items-center gap-2">
      <label htmlFor="new-service-type" className="sr-only">Service type</label>
      <select
        id="new-service-type"
        value={serviceType}
        onChange={(e) => setServiceType(e.target.value as ServiceType)}
        className="text-xs rounded-md border border-input px-2 py-1 bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <label htmlFor="new-service-time" className="sr-only">Service time</label>
      <input
        id="new-service-time"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="text-xs rounded-md border border-input px-2 py-1 bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {presets.length > 0 && (
        <>
          <label htmlFor="new-service-preset" className="sr-only">Preset</label>
          <select
            id="new-service-preset"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="text-xs rounded-md border border-input px-2 py-1 bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">No preset</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </>
      )}
      <Button
        onClick={() => onCreate({ serviceType, time, presetId: presetId || null })}
        disabled={creating}
        size="sm"
      >
        {creating
          ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          : <Plus className="h-3 w-3" strokeWidth={1.5} />}
        Add
      </Button>
    </div>
  );
}
