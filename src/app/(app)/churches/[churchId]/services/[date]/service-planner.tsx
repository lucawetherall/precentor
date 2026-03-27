"use client";

import { useState } from "react";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { SectionEditor } from "./section-editor";
import { ServiceSettings } from "./service-settings";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Service {
  id: string;
  serviceType: string;
  time: string | null;
  status: string;
  notes: string | null;
  sheetMode: string;
  eucharisticPrayer: string | null;
  includeReadingText: boolean;
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
  const [deleting, setDeleting] = useState(false);
  const [newType, setNewType] = useState<ServiceType>("SUNG_EUCHARIST");
  const [newTime, setNewTime] = useState("10:00");
  const { addToast } = useToast();

  const handleCreateService = async () => {
    setCreating(true);
    try {
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
        const newService: Service = {
          ...service,
          sheetMode: service.sheetMode ?? "summary",
          eucharisticPrayer: service.eucharisticPrayer ?? null,
          includeReadingText: service.includeReadingText ?? true,
        };
        setServices((prev) => [...prev, newService]);
        setActiveTab(newService.id);
        addToast("Service created", "success");
      } else {
        addToast("Failed to create service", "error");
      }
    } catch {
      addToast("Network error — could not create service", "error");
    }
    setCreating(false);
  };

  const handleDeleteService = async () => {
    if (!activeTab) return;
    const confirmed = window.confirm(
      "Delete this service? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/churches/${churchId}/services/${activeTab}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const remaining = services.filter((s) => s.id !== activeTab);
        setServices(remaining);
        setActiveTab(remaining[0]?.id || "");
        addToast("Service deleted", "success");
      } else {
        addToast("Failed to delete service", "error");
      }
    } catch {
      addToast("Network error — could not delete service", "error");
    }
    setDeleting(false);
  };

  const activeService = services.find((s) => s.id === activeTab);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-heading font-semibold">Services</h2>
      </div>

      {/* Service tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        <div role="tablist" aria-label="Services" className="flex items-center gap-1">
          {services.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={activeTab === s.id}
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
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="new-service-type" className="sr-only">Service type</label>
          <select
            id="new-service-type"
            value={newType}
            onChange={(e) => setNewType(e.target.value as ServiceType)}
            className="text-xs border border-border px-2 py-1 bg-background"
          >
            {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label htmlFor="new-service-time" className="sr-only">Service time</label>
          <input
            id="new-service-time"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="text-xs border border-border px-2 py-1 bg-background"
          />
          <button
            onClick={handleCreateService}
            disabled={creating}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground border border-primary hover:bg-primary-hover disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3 w-3" strokeWidth={1.5} />}
            Add
          </button>
        </div>
      </div>

      {/* Active service content */}
      {activeService && (
        <>
          <SectionEditor
            serviceId={activeService.id}
            churchId={churchId}
          />
          <ServiceSettings
            serviceId={activeService.id}
            serviceType={activeService.serviceType}
            churchId={churchId}
            initialSettings={{
              sheetMode: activeService.sheetMode,
              eucharisticPrayer: activeService.eucharisticPrayer,
              includeReadingText: activeService.includeReadingText,
            }}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleDeleteService}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 rounded-sm"
              aria-label="Delete service"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              ) : (
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
              )}
              Delete service
            </button>
          </div>
        </>
      )}

      {services.length === 0 && (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No services planned for this day. Add one above.</p>
        </div>
      )}
    </div>
  );
}
