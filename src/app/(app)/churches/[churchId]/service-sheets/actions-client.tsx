"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";

export function ServiceSheetActions({
  serviceId,
  churchId,
}: {
  serviceId: string;
  churchId: string;
}) {
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);

  const handleGenerate = async (format: "pdf" | "docx") => {
    setGenerating(format);
    try {
      const res = await fetch(
        `/api/churches/${churchId}/services/${serviceId}/sheet?format=${format}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `service-sheet.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Failed to generate:", e);
    }
    setGenerating(null);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleGenerate("pdf")}
        disabled={generating !== null}
        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
      >
        {generating === "pdf" ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
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
    </div>
  );
}
