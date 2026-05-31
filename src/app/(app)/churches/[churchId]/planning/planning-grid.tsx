"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { PlanningRow, CellDisplay, GridColumn } from "./types";
import type { ApiResponse } from "./api-types";
import { DateRangeControls } from "./date-range-controls";
import { usePlanningGrid, rowKey } from "./use-planning-grid";
import { PlanningCell } from "./planning-cell";
import { getColumnSearch } from "./column-search";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CsvImportModal } from "./csv-import-modal";
import { buildRowsFromApi } from "./build-rows";
import { serviceLabel } from "./derive-cells";
import { COLUMN_ORDER } from "@/lib/planning/columns";
import type { PlanningDataResponse } from "@/lib/planning/data";

const COLUMNS: { key: GridColumn; label: string }[] = [
  { key: "introit", label: "Introit" },
  { key: "hymns", label: "Hymns" },
  { key: "setting", label: "Setting" },
  { key: "psalm", label: "Psalm" },
  { key: "chant", label: "Chant" },
  { key: "respAccl", label: "Resp/Accl" },
  { key: "anthem", label: "Anthem" },
  { key: "voluntary", label: "Voluntary" },
  { key: "info", label: "Info" },
];

interface Props {
  churchId: string;
  from: string;
  to: string;
  initialData: PlanningDataResponse;
}

export function PlanningGrid({ churchId, from, to, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [hasNoPatterns, setHasNoPatterns] = useState(initialData.patterns.length === 0);

  const { state, dispatch, getCell } = usePlanningGrid(
    buildRowsFromApi(initialData as ApiResponse, from, to),
  );

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    setLoading(true);
    setFetchError(null);

    fetch(`/api/churches/${churchId}/planning?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        setHasNoPatterns(data.patterns.length === 0);
        dispatch({ type: "SET_ROWS", rows: buildRowsFromApi(data, from, to) });
        setLoading(false);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [churchId, from, to, dispatch]);

  async function persistCell(row: PlanningRow, column: GridColumn, value: CellDisplay) {
    dispatch({ type: "SAVE_STATUS", status: "saving" });
    const body = row.kind === "real"
      ? { serviceId: row.serviceId, column, value: { text: value.displayText, refId: value.refId ?? null }, expectedUpdatedAt: row.updatedAt }
      : { ghost: { date: row.date, serviceType: row.serviceType, time: row.time }, column, value: { text: value.displayText, refId: value.refId ?? null } };
    try {
      const res = await fetch(`/api/churches/${churchId}/planning/cell`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as { serviceId?: string; updatedAt?: string };
        if (row.kind === "ghost" && row.ghostId && data.serviceId && data.updatedAt) {
          dispatch({ type: "REPLACE_ROW_ID", ghostId: row.ghostId, serviceId: data.serviceId, updatedAt: data.updatedAt });
        } else if (row.kind === "real" && row.serviceId && data.updatedAt) {
          dispatch({ type: "SET_ROW_UPDATED_AT", serviceId: row.serviceId, updatedAt: data.updatedAt });
        }
        dispatch({ type: "SAVE_STATUS", status: "saved" });
        setTimeout(() => dispatch({ type: "SAVE_STATUS", status: "idle" }), 1500);
      } else {
        dispatch({ type: "SAVE_STATUS", status: "error" });
      }
    } catch {
      dispatch({ type: "SAVE_STATUS", status: "error" });
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !state.editing) {
        if (state.lastEdit) {
          const { rowKey: rk, column, previous } = state.lastEdit;
          const row = state.rows.find((r) => rowKey(r) === rk);
          if (row) {
            e.preventDefault();
            dispatch({ type: "UNDO" });
            void persistCell(row, column, previous);
          }
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c" && !state.editing && state.focus) {
        const row = state.rows.find((r) => rowKey(r) === state.focus!.rowKey);
        if (!row) return;
        const cell = getCell(row, state.focus.column);
        void navigator.clipboard.writeText(cell.displayText ?? "");
        e.preventDefault();
        return;
      }

      if (state.editing) return;
      if (!state.focus) return;

      const rowIdx = state.rows.findIndex((r) => rowKey(r) === state.focus!.rowKey);
      const colIdx = COLUMN_ORDER.indexOf(state.focus.column);
      if (rowIdx < 0 || colIdx < 0) return;

      let nextRow = rowIdx, nextCol = colIdx;
      if (e.key === "ArrowRight") nextCol = Math.min(COLUMN_ORDER.length - 1, colIdx + 1);
      else if (e.key === "ArrowLeft") nextCol = Math.max(0, colIdx - 1);
      else if (e.key === "ArrowDown") nextRow = Math.min(state.rows.length - 1, rowIdx + 1);
      else if (e.key === "ArrowUp") nextRow = Math.max(0, rowIdx - 1);
      else return;

      e.preventDefault();
      dispatch({ type: "FOCUS", rowKey: rowKey(state.rows[nextRow]), column: COLUMN_ORDER[nextCol] });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editing, state.focus, state.rows, state.lastEdit, dispatch, getCell]);

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      if (state.editing) return;
      if (!state.focus) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;
      if (!text.includes("\n") && !text.includes("\t")) return;
      e.preventDefault();

      const grid = text
        .replace(/\r\n?/g, "\n")
        .replace(/\n$/, "")
        .split("\n")
        .map((line) => line.split("\t"));

      const startRowIdx = state.rows.findIndex((r) => rowKey(r) === state.focus!.rowKey);
      const startColIdx = COLUMN_ORDER.indexOf(state.focus!.column);
      if (startRowIdx < 0 || startColIdx < 0) return;

      const changes: Array<{
        serviceId?: string;
        ghost?: { date: string; serviceType: string; time: string | null };
        column: GridColumn;
        value: { text: string; refId: string | null };
      }> = [];

      grid.forEach((cells, dr) => {
        const row = state.rows[startRowIdx + dr];
        if (!row) return;
        cells.forEach((cellValue, dc) => {
          const colIdx = startColIdx + dc;
          if (colIdx >= COLUMN_ORDER.length) return;
          const column = COLUMN_ORDER[colIdx];
          const value = { text: cellValue, refId: null };
          const change = row.kind === "real"
            ? { serviceId: row.serviceId, column, value }
            : { ghost: { date: row.date, serviceType: row.serviceType, time: row.time }, column, value };
          changes.push(change);
          dispatch({
            type: "COMMIT_CELL",
            rowKey: rowKey(row),
            column,
            value: { displayText: cellValue, refId: null, isUnmatched: cellValue.length > 0 },
            previous: getCell(row, column),
          });
        });
      });

      if (changes.length === 0) return;
      dispatch({ type: "SAVE_STATUS", status: "saving" });
      const res = await fetch(`/api/churches/${churchId}/planning/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      if (res.ok) {
        dispatch({ type: "SAVE_STATUS", status: "saved" });
        setTimeout(() => dispatch({ type: "SAVE_STATUS", status: "idle" }), 1500);
        const refetch = await fetch(`/api/churches/${churchId}/planning?from=${from}&to=${to}`);
        if (refetch.ok) {
          const data = await refetch.json() as ApiResponse;
          dispatch({ type: "SET_ROWS", rows: buildRowsFromApi(data, from, to) });
        }
      } else {
        dispatch({ type: "SAVE_STATUS", status: "error" });
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [state.editing, state.focus, state.rows, churchId, from, to, dispatch, getCell]);

  if (loading) {
    return (
      <>
        <div className="mb-4">
          <DateRangeControls from={from} to={to} />
        </div>
        <p className="text-sm text-muted-foreground">Loading grid…</p>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <div className="mb-4">
          <DateRangeControls from={from} to={to} />
        </div>
        <p className="text-sm text-destructive">Error: {fetchError}</p>
      </>
    );
  }

  if (state.rows.length === 0) {
    return (
      <>
        <div className="mb-4">
          <DateRangeControls from={from} to={to} />
        </div>
        <p className="text-sm text-muted-foreground">No services found for this period.</p>
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DateRangeControls from={from} to={to} />
        <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
          Import CSV
        </Button>
      </div>

      {hasNoPatterns && (
        <div className="mb-3 p-2 text-xs border rounded bg-muted/40 text-muted-foreground">
          Showing default Sunday and Festival rows.{" "}
          <Link
            className="underline"
            href={`/churches/${churchId}/settings/service-patterns`}
          >
            Configure service patterns
          </Link>{" "}
          to add weekday and additional services.
        </div>
      )}

      <div className="text-xs text-muted-foreground h-5 mb-2">
        {state.saveStatus === "saving" && "Saving…"}
        {state.saveStatus === "saved" && "Saved ✓"}
        {state.saveStatus === "error" && <span className="text-destructive">Error saving</span>}
      </div>

      {csvOpen && (
        <CsvImportModal
          churchId={churchId}
          onClose={() => setCsvOpen(false)}
          onImported={() => window.location.reload()}
        />
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium min-w-[140px]">Date / Service</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-left p-2 font-medium whitespace-nowrap">
                {col.label}
              </th>
            ))}
            <th className="text-left p-2 font-medium whitespace-nowrap">Readings</th>
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => {
            const rk = rowKey(row);
            const isGhost = row.kind === "ghost";
            let dateLabel = row.date;
            try {
              dateLabel = format(parseISO(row.date), "EEE d MMM");
            } catch {
              // keep raw
            }
            return (
              <tr
                key={rk}
                className={`border-b border-border hover:bg-muted/40 transition-colors ${
                  isGhost ? "opacity-60" : ""
                }`}
              >
                <td className="p-2 min-w-[140px] align-top">
                  <span className="block font-medium">{dateLabel}</span>
                  <span className="block text-xs text-muted-foreground">
                    {serviceLabel(row.serviceType)}
                    {row.time ? ` · ${row.time}` : ""}
                  </span>
                </td>
                {COLUMNS.map((col) => {
                  const isFocused = state.focus?.rowKey === rk && state.focus?.column === col.key;
                  const isEditing = isFocused && state.editing;
                  const cellValue = getCell(row, col.key);
                  return (
                    <PlanningCell
                      key={col.key}
                      column={col.key}
                      value={cellValue}
                      focused={isFocused}
                      editing={isEditing}
                      serviceType={row.serviceType}
                      churchId={churchId}
                      search={getColumnSearch(col.key, row.serviceType)}
                      onFocus={() => dispatch({ type: "FOCUS", rowKey: rk, column: col.key })}
                      onEnterEdit={() => {
                        dispatch({ type: "FOCUS", rowKey: rk, column: col.key });
                        dispatch({ type: "ENTER_EDIT" });
                      }}
                      onCancelEdit={() => dispatch({ type: "CANCEL_EDIT" })}
                      onCommit={(next) => {
                        const previous = cellValue;
                        dispatch({ type: "COMMIT_CELL", rowKey: rk, column: col.key, value: next, previous });
                        void persistCell(row, col.key, next);
                      }}
                    />
                  );
                })}
                <td className="px-3 py-2 border-t align-top text-xs">
                  <Popover>
                    <PopoverTrigger className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">
                      {row.readings.length > 0 ? `${row.readings.length} readings` : "—"}
                    </PopoverTrigger>
                    <PopoverContent align="end" className="min-w-[200px] max-w-[280px] p-2 text-xs">
                      {row.readings.length === 0 ? (
                        <p className="text-muted-foreground">No readings.</p>
                      ) : (
                        row.readings.map((r, i) => (
                          <div key={i} className="mb-0.5">
                            {r.text && <strong>{r.text}: </strong>}{r.ref}
                          </div>
                        ))
                      )}
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
