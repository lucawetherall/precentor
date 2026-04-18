"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  churchId: string;
  churchName: string;
}

// Must mirror MAX_RANGE_DAYS in the API route. Kept in sync by convention.
const MAX_RANGE_DAYS = 366;

export function MusicListFormClient({ churchId, churchName }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultTo = format(addDays(new Date(), 60), "yyyy-MM-dd");

  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(defaultTo);
  const [nameOverride, setNameOverride] = useState<string>("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `to` must be >= from and within MAX_RANGE_DAYS of from.
  const toMax = from
    ? format(addDays(parseISO(from), MAX_RANGE_DAYS), "yyyy-MM-dd")
    : undefined;

  const disabled = !from || !to || from > to || (!!toMax && to > toMax);

  const handleGenerate = async (preview: boolean) => {
    const key = preview ? "preview" : "pdf";
    setGenerating(key);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (nameOverride.trim()) params.set("churchName", nameOverride.trim());
      const res = await fetch(
        `/api/churches/${churchId}/music-list?${params.toString()}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Failed (${res.status})`);
        setGenerating(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (preview) {
        window.open(url, "_blank");
        // Blob URL must stay alive until the new tab has fetched it. 60s is
        // well past any reasonable PDF-load time; revoking prevents a slow
        // memory leak across repeated previews.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `music-list-${from}-to-${to}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Network error — could not generate music list");
    }
    setGenerating(null);
  };

  return (
    <div className="space-y-4 border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="music-list-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <input
            id="music-list-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="music-list-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <input
            id="music-list-to"
            type="date"
            value={to}
            min={from || undefined}
            max={toMax}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="music-list-church-name"
          className="text-xs font-medium text-muted-foreground"
        >
          Church name on masthead (optional)
        </label>
        <input
          id="music-list-church-name"
          type="text"
          value={nameOverride}
          onChange={(e) => setNameOverride(e.target.value)}
          placeholder={churchName}
          className="px-2 py-1.5 text-sm rounded-md border border-input bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleGenerate(true)}
          disabled={disabled || generating !== null}
          aria-label="Preview music list PDF"
        >
          {generating === "preview" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          ) : (
            <Eye className="h-3 w-3" strokeWidth={1.5} />
          )}
        </Button>

        <Button
          size="sm"
          onClick={() => handleGenerate(false)}
          disabled={disabled || generating !== null}
        >
          {generating === "pdf" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
          ) : (
            <FileText className="h-3 w-3" strokeWidth={1.5} />
          )}
          Generate PDF
        </Button>

        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
