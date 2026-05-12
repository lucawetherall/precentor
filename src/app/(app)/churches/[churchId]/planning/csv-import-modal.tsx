"use client";

import { useState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { parseCsvToRows, type CsvParsedRow } from "./csv-parse";
import { downloadCsvTemplate } from "./csv-template";
import { useToast } from "@/components/ui/toast";

interface Props {
  churchId: string;
  onClose: () => void;
  onImported: () => void;
}

export function CsvImportModal({ churchId, onClose, onImported }: Props) {
  const [rows, setRows] = useState<CsvParsedRow[] | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const { addToast } = useToast();

  // Close on Escape so the modal matches the rest of the app's dialogs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsvToRows(String(reader.result)).rows);
    reader.onerror = () => addToast("Could not read CSV file. Please try again.", "error");
    reader.readAsText(f);
  }

  async function commit() {
    if (!rows) return;
    setBusy(true);
    const valid = rows.filter((r) => r.status === "valid" && r.data);
    const changes = valid.flatMap((r) => {
      const d = r.data!;
      const base = { ghost: { date: d.date, serviceType: d.serviceType, time: d.time } };
      const cols: Array<[string, string]> = [
        ["introit", d.introit], ["hymns", d.hymns], ["setting", d.setting],
        ["psalm", d.psalm], ["chant", d.chant], ["respAccl", d.respAccl],
        ["anthem", d.anthem], ["voluntary", d.voluntary], ["info", d.info],
      ];
      return cols
        .filter(([, v]) => overwrite || v.length > 0)
        .map(([col, v]) => ({ ...base, column: col, value: { text: v, refId: null } }));
    });
    try {
      const res = await fetch(`/api/churches/${churchId}/planning/bulk`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      setBusy(false);
      if (res.ok) {
        addToast(`Imported ${valid.length} row${valid.length === 1 ? "" : "s"}.`, "success");
        onImported();
        onClose();
      } else {
        addToast("Import failed. Please check your file and try again.", "error");
      }
    } catch {
      setBusy(false);
      addToast("Import failed. Please check your connection and try again.", "error");
    }
  }

  const validCount = rows?.filter((r) => r.status === "valid").length ?? 0;
  const invalidCount = rows?.filter((r) => r.status === "invalid").length ?? 0;

  return (
    <div
      className="fixed inset-0 bg-background/80 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background border rounded shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={titleId} className="text-lg font-semibold">Import CSV</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        {!rows && (
          <div className="space-y-3">
            <input type="file" accept=".csv" onChange={onFile} aria-label="Upload CSV file" />
            <div>
              <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>Download template</Button>
            </div>
          </div>
        )}
        {rows && (
          <>
            <p className="text-sm mb-3">{validCount} valid, {invalidCount} invalid rows</p>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              Overwrite existing values with blank cells
            </label>
            <div className="overflow-auto max-h-[40vh] mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1">Status</th>
                    <th className="text-left p-1">Date</th>
                    <th className="text-left p-1">Service</th>
                    <th className="text-left p-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.status === "invalid" ? "bg-destructive/10" : "bg-green-500/10"}>
                      <td className="p-1 font-medium">{r.status}</td>
                      <td className="p-1">{r.raw.date}</td>
                      <td className="p-1">{r.raw.service_type}</td>
                      <td className="p-1 text-destructive">{r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button onClick={commit} disabled={busy || validCount === 0}>Import {validCount} rows</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
