"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, FileDown, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  churchId: string;
  serviceId: string;
  sheetMode: "booklet" | "summary";
}

export function PdfPreviewDialog({ churchId, serviceId, sheetMode }: Props) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Always free the last blob URL on unmount — open/close re-renders are
  // handled inline below.
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function closeAndFree() {
    setOpen(false);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setError(null);
  }

  async function openPreview() {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const url = `/api/churches/${churchId}/services/${serviceId}/sheet?format=pdf&mode=${sheetMode}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError("Failed to load PDF preview");
        setLoading(false);
        return;
      }
      const blob = await res.blob();
      const next = URL.createObjectURL(blob);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = next;
      setBlobUrl(next);
    } catch {
      setError("Network error loading PDF");
    }
    setLoading(false);
  }

  function download(format: "pdf" | "docx") {
    const url = `/api/churches/${churchId}/services/${serviceId}/sheet?format=${format}&mode=${sheetMode}`;
    window.open(url, "_blank");
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openPreview} disabled={loading}>
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          : <Eye className="h-3 w-3" strokeWidth={1.5} />}
        Preview PDF
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeAndFree(); }}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-sm">PDF Preview</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => download("pdf")}>
                  <FileDown className="h-3 w-3" strokeWidth={1.5} />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => download("docx")}>
                  <FileText className="h-3 w-3" strokeWidth={1.5} />
                  Download DOCX
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                Loading PDF…
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center h-full text-destructive text-sm">
                {error}
              </div>
            )}
            {blobUrl && !loading && (
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
