"use client";

import { useState, useRef } from "react";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { SectionEditor } from "./section-editor";
import { ServiceSettings } from "./service-settings";
import { BookletPreview } from "./booklet-preview";
import { ServiceEditorProvider } from "./service-editor-context";
import { SaveStatusIndicator } from "./save-status-indicator";
import { SectionCountBadge } from "./section-count-badge";
import type { ServiceSection } from "./section-row";
import type { MusicSlot } from "./use-service-editor";
import { Plus, Loader2, Trash2, BookOpen, FileDown, FileText, Eye } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Service {
  id: string;
  serviceType: string;
  time: string | null;
  status: string;
  notes: string | null;
  sheetMode: string;
  eucharisticPrayer: string | null;
  eucharisticPrayerId: string | null;
  includeReadingText: boolean;
  choirStatus: string;
  defaultMassSettingId: string | null;
  collectId: string | null;
  collectOverride: string | null;
}


export function ServicePlanner({
  churchId,
  liturgicalDayId,
  date,
  existingServices,
  editorSectionsMap = {},
  editorSlotsMap = {},
}: {
  churchId: string;
  liturgicalDayId: string;
  date: string;
  existingServices: Service[];
  editorSectionsMap?: Record<string, ServiceSection[]>;
  editorSlotsMap?: Record<string, MusicSlot[]>;
}) {
  const [services, setServices] = useState<Service[]>(existingServices);
  const [activeTab, setActiveTab] = useState<string>(services[0]?.id || "");
  const [editorTab, setEditorTab] = useState<"order" | "settings" | "preview">("order");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newType, setNewType] = useState<ServiceType>("SUNG_EUCHARIST");
  const [newTime, setNewTime] = useState("10:00");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
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
          eucharisticPrayerId: service.eucharisticPrayerId ?? null,
          includeReadingText: service.includeReadingText ?? true,
          choirStatus: service.choirStatus ?? "CHOIR_REQUIRED",
          defaultMassSettingId: service.defaultMassSettingId ?? null,
          collectId: service.collectId ?? null,
          collectOverride: service.collectOverride ?? null,
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

  // Revoke old blob URL when dialog closes or a new one is created
  const handlePdfDialogClose = () => {
    setPdfDialogOpen(false);
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
    setPdfBlobUrl(null);
    setPdfError(null);
  };

  const handlePreviewPdf = async () => {
    if (!activeService) return;
    setPdfLoading(true);
    setPdfError(null);
    setPdfDialogOpen(true);
    try {
      const sheetMode = activeService.sheetMode === "booklet" ? "booklet" : "summary";
      const url = `/api/churches/${churchId}/services/${activeService.id}/sheet?format=pdf&mode=${sheetMode}`;
      const res = await fetch(url);
      if (!res.ok) {
        setPdfError("Failed to load PDF preview");
        setPdfLoading(false);
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      // Revoke any previous blob URL
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
      pdfBlobUrlRef.current = blobUrl;
      setPdfBlobUrl(blobUrl);
    } catch {
      setPdfError("Network error loading PDF");
    }
    setPdfLoading(false);
  };

  const handleDownload = (format: "pdf" | "docx") => {
    if (!activeService) return;
    const sheetMode = activeService.sheetMode === "booklet" ? "booklet" : "summary";
    const url = `/api/churches/${churchId}/services/${activeService.id}/sheet?format=${format}&mode=${sheetMode}`;
    window.open(url, "_blank");
  };

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
              className={`px-3 py-2 font-heading text-sm border-b-2 transition-colors ${
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
        <ServiceEditorProvider
          key={activeService.id}
          serviceId={activeService.id}
          churchId={churchId}
          initialSections={(editorSectionsMap[activeService.id] ?? []) as ServiceSection[]}
          initialSettings={{
            sheetMode: activeService.sheetMode,
            eucharisticPrayer: activeService.eucharisticPrayer,
            eucharisticPrayerId: activeService.eucharisticPrayerId,
            includeReadingText: activeService.includeReadingText,
            choirStatus: activeService.choirStatus,
            defaultMassSettingId: activeService.defaultMassSettingId,
            collectId: activeService.collectId,
            collectOverride: activeService.collectOverride,
          }}
          initialSlots={(editorSlotsMap[activeService.id] ?? []) as MusicSlot[]}
        >
          {/* Editor sub-tabs with save status */}
          <div className="flex items-center border-b border-border mb-4">
            <div role="tablist" aria-label="Editor sections" className="flex items-center gap-4">
              <button
                role="tab"
                aria-selected={editorTab === "order"}
                onClick={() => setEditorTab("order")}
                className={`pb-2 font-mono text-[10px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
                  editorTab === "order"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Running Order <SectionCountBadge />
              </button>
              <button
                role="tab"
                aria-selected={editorTab === "settings"}
                onClick={() => setEditorTab("settings")}
                className={`pb-2 font-mono text-[10px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
                  editorTab === "settings"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Settings
              </button>
              <button
                role="tab"
                aria-selected={editorTab === "preview"}
                onClick={() => setEditorTab("preview")}
                className={`pb-2 font-mono text-[10px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
                  editorTab === "preview"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Preview
              </button>
            </div>
            <div className="ml-auto pb-2">
              <SaveStatusIndicator />
            </div>
          </div>

          {/* Running Order tab */}
          {editorTab === "order" && (
            <SectionEditor churchId={churchId} />
          )}

          {/* Settings tab */}
          {editorTab === "settings" && (
            <ServiceSettings serviceType={activeService.serviceType} />
          )}

          {/* Preview tab */}
          {editorTab === "preview" && (
            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  onClick={handlePreviewPdf}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-3 w-3" strokeWidth={1.5} />
                  )}
                  Preview PDF
                </button>
              </div>
              <BookletPreview
                churchId={churchId}
                serviceId={activeService.id}
                mode={activeService.sheetMode === "booklet" ? "booklet" : "summary"}
                isVisible={true}
              />
            </div>
          )}

          {/* Service-level actions */}
          <div className="mt-4 flex items-center justify-end">
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
        </ServiceEditorProvider>
      )}

      {services.length === 0 && (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No services planned for this day. Add one above.</p>
        </div>
      )}

      {/* PDF Preview Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={(open) => { if (!open) handlePdfDialogClose(); }}>
        <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-sm">PDF Preview</DialogTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload("pdf")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm"
                >
                  <FileDown className="h-3 w-3" strokeWidth={1.5} />
                  Download PDF
                </button>
                <button
                  onClick={() => handleDownload("docx")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm"
                >
                  <FileText className="h-3 w-3" strokeWidth={1.5} />
                  Download DOCX
                </button>
                <button
                  onClick={() => {
                    handlePdfDialogClose();
                    setEditorTab("preview");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border hover:border-primary hover:text-primary transition-colors rounded-sm"
                >
                  <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                  Edit
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {pdfLoading && (
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                Loading PDF…
              </div>
            )}
            {pdfError && (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                {pdfError}
              </div>
            )}
            {pdfBlobUrl && !pdfLoading && (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
