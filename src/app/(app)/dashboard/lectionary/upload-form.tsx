"use client";

import { useState } from "react";

export function LectionaryUpload() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; imported?: number; errors?: number; error?: string } | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/cron/sync-lectionary/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: "Upload failed" });
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/sync-lectionary");
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: "Sync failed" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <form onSubmit={handleUpload} className="flex gap-2 items-end">
          <div>
            <label htmlFor="ics-file" className="block text-sm font-body mb-1">
              Upload .ics file
            </label>
            <input
              id="ics-file"
              name="file"
              type="file"
              accept=".ics"
              required
              className="text-sm border border-border px-2 py-1 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-transparent text-primary border border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
        >
          Sync from Oremus
        </button>
      </div>

      {result && (
        <div className={`text-sm p-3 border ${result.success ? "border-[#4A6741] text-[#4A6741]" : "border-destructive text-destructive"}`}>
          {result.success
            ? `Imported ${result.imported} days (${result.errors} errors)`
            : result.error || "Import failed"}
        </div>
      )}
    </div>
  );
}
