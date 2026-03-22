"use client";

import { useState } from "react";
import { SERVICE_TYPE_LABELS, EUCHARIST_SLOTS, EVENSONG_SLOTS, MUSIC_SLOT_LABELS } from "@/types";
import type { ServiceType, MusicSlotType } from "@/types";
import { MusicSlotEditor } from "./music-slot-editor";
import { Plus } from "lucide-react";

interface Service {
  id: string;
  serviceType: string;
  time: string | null;
  status: string;
  notes: string | null;
}

export function ServicePlanner({
  churchId,
  liturgicalDayId,
  date,
  existingServices,
}: {
  churchId: string;
  liturgicalDayId: string;
  date: string;
  existingServices: Service[];
}) {
  const [services, setServices] = useState<Service[]>(existingServices);
  const [activeTab, setActiveTab] = useState<string>(services[0]?.id || "");
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<ServiceType>("SUNG_EUCHARIST");
  const [newTime, setNewTime] = useState("10:00");

  const handleCreateService = async () => {
    setCreating(true);
    const res = await fetch(`/api/churches/${churchId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liturgicalDayId,
        serviceType: newType,
        time: newTime,
      }),
    });

    if (res.ok) {
      const service = await res.json();
      setServices((prev) => [...prev, service]);
      setActiveTab(service.id);
    }
    setCreating(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-heading font-semibold">Services</h2>
      </div>

      {/* Service tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              activeTab === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
            {s.time && <span className="ml-1 text-xs text-muted-foreground">({s.time})</span>}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as ServiceType)}
            className="text-xs border border-border px-2 py-1 bg-white"
          >
            {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="text-xs border border-border px-2 py-1 bg-white"
          />
          <button
            onClick={handleCreateService}
            disabled={creating}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} />
            Add
          </button>
        </div>
      </div>

      {/* Active service music slots */}
      {activeTab && (
        <MusicSlotEditor
          serviceId={activeTab}
          serviceType={services.find((s) => s.id === activeTab)?.serviceType || "CUSTOM"}
          churchId={churchId}
        />
      )}

      {services.length === 0 && (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No services planned for this day. Add one above.</p>
        </div>
      )}
    </div>
  );
}
