"use client";

import { useState } from "react";

export function LectionarySync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported?: number;
    errors?: number;
    total?: number;
    lectionaryYear?: string;
    churchYear?: string;
    error?: string;
  } | null>(null);
  const [fetchText, setFetchText] = useState(false);
  const [version, setVersion] = useState("NRSVAE");

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (fetchText) params.set("fetchText", "true");
      if (version !== "NRSVAE") params.set("version", version);

      const res = await fetch(`/api/cron/sync-lectionary?${params}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Sync failed" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label htmlFor="bible-version" className="block text-sm font-body mb-1">
            Bible version
          </label>
          <select
            id="bible-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="text-sm border border-border px-2 py-1.5 bg-white"
          >
            <option value="NRSVAE">NRSVAE (New Revised Standard Version Anglicized)</option>
            <option value="NRSV">NRSV (New Revised Standard Version)</option>
            <option value="AV">AV (Authorized / King James Version)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fetchText}
            onChange={(e) => setFetchText(e.target.checked)}
            className="accent-primary"
          />
          Fetch reading text from Oremus
        </label>

        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync Current Year"}
        </button>
      </div>

      {result && (
        <div className={`text-sm p-3 border ${result.success ? "border-[#4A6741] text-[#4A6741]" : "border-destructive text-destructive"}`}>
          {result.success
            ? `Synced ${result.imported}/${result.total} days for ${result.churchYear} (Year ${result.lectionaryYear})${result.errors ? `, ${result.errors} errors` : ""}`
            : result.error || "Sync failed"}
        </div>
      )}
    </div>
  );
}
