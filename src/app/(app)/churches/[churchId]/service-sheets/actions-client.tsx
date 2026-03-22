"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Eye, BookOpen } from "lucide-react";

type SheetMode = "summary" | "booklet";

export function ServiceSheetActions({
  serviceId,
  churchId,
  defaultMode,
}: {
  serviceId: string;
  churchId: string;
  defaultMode?: SheetMode;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SheetMode>(defaultMode ?? "summary");
  const [size, setSize] = useState<"A4" | "A5">(
    defaultMode === "booklet" ? "A5" : "A4"
  );

  const handleModeChange = (newMode: SheetMode) => {
    setMode(newMode);
    setSize(newMode === "booklet" ? "A5" : "A4");
  };

  const handleGenerate = async (format: "pdf" | "docx", preview = false) => {
    const key = preview ? "preview" : format;
    setGenerating(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/sheet?format=${format}&size=${size}&mode=${mode}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Failed to generate (${res.status})`);
        setGenerating(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (preview) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `service-sheet.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Network error — could not generate sheet");
    }
    setGenerating(null);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as SheetMode)}
        className="px-2 py-1 text-xs border border-border bg-background"
        aria-label="Sheet mode"
      >
        <option value="summary">Summary</option>
        <option value="booklet">Booklet</option>
      </select>

      <select
        value={size}
        onChange={(e) => setSize(e.target.value as "A4" | "A5")}
        className="px-2 py-1 text-xs border border-border bg-background"
        aria-label="Paper size"
      >
        <option value="A4">A4</option>
        <option value="A5">A5</option>
      </select>

      <button
        onClick={() => handleGenerate("pdf", true)}
        disabled={generating !== null}
        aria-label="Preview PDF"
        className="flex items-center gap-1 px-2 py-1.5 text-xs bg-transparent text-muted-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
      >
        {generating === "preview" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : (
          <Eye className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>

      <button
        onClick={() => handleGenerate("pdf")}
        disabled={generating !== null}
        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {generating === "pdf" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : mode === "booklet" ? (
          <BookOpen className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <FileText className="h-3 w-3" strokeWidth={1.5} />
        )}
        PDF
      </button>
      <button
        onClick={() => handleGenerate("docx")}
        disabled={generating !== null}
        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-transparent text-primary border border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
      >
        {generating === "docx" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : (
          <Download className="h-3 w-3" strokeWidth={1.5} />
        )}
        DOCX
      </button>

      {error && (
        <span role="alert" className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}

export function BatchDownloadActions({
  serviceIds,
  churchId,
}: {
  serviceIds: string[];
  churchId: string;
}) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SheetMode>("summary");
  const [size, setSize] = useState<"A4" | "A5">("A4");

  const handleModeChange = (newMode: SheetMode) => {
    setMode(newMode);
    setSize(newMode === "booklet" ? "A5" : "A4");
  };

  const handleBatch = async (format: "pdf" | "docx") => {
    if (serviceIds.length === 0) return;
    setGenerating(format);
    setError(null);
    try {
      const res = await fetch(`/api/churches/${churchId}/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds, format, size, mode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Batch generation failed (${res.status})`);
        setGenerating(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `service-sheets.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error — could not generate sheets");
    }
    setGenerating(null);
  };

  if (serviceIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-4 border border-border bg-card shadow-sm">
      <span className="text-sm text-muted-foreground flex-1">
        Download all {serviceIds.length} service sheets:
      </span>

      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as SheetMode)}
        className="px-2 py-1.5 text-xs border border-border bg-background"
        aria-label="Sheet mode"
      >
        <option value="summary">Summary</option>
        <option value="booklet">Booklet</option>
      </select>

      <select
        value={size}
        onChange={(e) => setSize(e.target.value as "A4" | "A5")}
        className="px-2 py-1.5 text-xs border border-border bg-background"
        aria-label="Paper size"
      >
        <option value="A4">A4</option>
        <option value="A5">A5</option>
      </select>

      <button
        onClick={() => handleBatch("pdf")}
        disabled={generating !== null}
        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {generating === "pdf" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : (
          <FileText className="h-3 w-3" strokeWidth={1.5} />
        )}
        All as PDF
      </button>
      <button
        onClick={() => handleBatch("docx")}
        disabled={generating !== null}
        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-transparent text-primary border border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
      >
        {generating === "docx" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        ) : (
          <Download className="h-3 w-3" strokeWidth={1.5} />
        )}
        All as DOCX
      </button>

      {error && (
        <span role="alert" className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
