"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { computeGhostRows } from "./ghost-rows";
import type { PatternInput, ExistingServiceRef } from "./ghost-rows";
import type {
  PlanningRow,
  CellDisplay,
  GridColumn,
  ReadingsDisplay,
} from "./types";
import { DateRangeControls } from "./date-range-controls";
import { usePlanningGrid, rowKey } from "./use-planning-grid";
import { PlanningCell } from "./planning-cell";
import { getColumnSearch } from "./column-search";

// ─── API response types ───────────────────────────────────────

interface ApiDay {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
}

interface ApiService {
  id: string;
  churchId: string;
  liturgicalDayId: string;
  serviceType: string;
  time: string | null;
  notes: string | null;
  updatedAt: string;
}

interface ApiSlot {
  id: string;
  serviceId: string;
  slotType: string;
  positionOrder: number;
  hymnId: string | null;
  anthemId: string | null;
  massSettingId: string | null;
  canticleSettingId: string | null;
  responsesSettingId: string | null;
  freeText: string | null;
  psalmChant: string | null;
  hymnBook: string | null;
  hymnNumber: number | null;
  hymnFirstLine: string | null;
  anthemTitle: string | null;
  anthemComposer: string | null;
  massSettingName: string | null;
  massSettingComposer: string | null;
  canticleSettingName: string | null;
  canticleSettingComposer: string | null;
  responsesSettingName: string | null;
  responsesSettingComposer: string | null;
}

interface ApiReading {
  id: string;
  liturgicalDayId: string;
  lectionary: string;
  position: string;
  reference: string;
  bookName: string | null;
  readingText: string | null;
}

interface ApiResponse {
  days: ApiDay[];
  services: ApiService[];
  slots: ApiSlot[];
  readings: ApiReading[];
  patterns: PatternInput[];
}

// ─── Display helpers ──────────────────────────────────────────

function emptyCell(): CellDisplay {
  return { displayText: "" };
}

function cellText(text: string): CellDisplay {
  return { displayText: text };
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function deriveIntroit(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "INTROIT");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveHymns(slots: ApiSlot[]): CellDisplay {
  const hymnSlots = slots
    .filter((s) => s.slotType === "HYMN")
    .sort((a, b) => a.positionOrder - b.positionOrder);
  if (hymnSlots.length === 0) return emptyCell();

  const parts = hymnSlots.map((s) => {
    if (s.hymnNumber != null) return String(s.hymnNumber);
    if (s.freeText) return s.freeText;
    return "";
  }).filter(Boolean);

  return cellText(parts.join(", "));
}

function deriveSetting(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const magSlot = slots.find((s) => s.slotType === "CANTICLE_MAGNIFICAT");
    if (!magSlot) return emptyCell();
    if (magSlot.canticleSettingName) {
      return cellText(joinParts(magSlot.canticleSettingName, magSlot.canticleSettingComposer));
    }
    if (magSlot.freeText) return cellText(magSlot.freeText);
    return emptyCell();
  }
  // Eucharist
  const globalSlot = slots.find((s) => s.slotType === "MASS_SETTING_GLOBAL");
  if (globalSlot) {
    if (globalSlot.massSettingName) {
      return cellText(joinParts(globalSlot.massSettingName, globalSlot.massSettingComposer));
    }
    if (globalSlot.freeText) return cellText(globalSlot.freeText);
  }
  return emptyCell();
}

function derivePsalm(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveChant(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (!slot) return emptyCell();
  if (slot.psalmChant) return cellText(slot.psalmChant);
  return emptyCell();
}

function deriveRespAccl(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const slot = slots.find((s) => s.slotType === "RESPONSES");
    if (!slot) return emptyCell();
    if (slot.responsesSettingName) {
      return cellText(joinParts(slot.responsesSettingName, slot.responsesSettingComposer));
    }
    if (slot.freeText) return cellText(slot.freeText);
    return emptyCell();
  }
  // Eucharist
  const slot = slots.find((s) => s.slotType === "GOSPEL_ACCLAMATION");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveAnthem(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ANTHEM");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveVoluntary(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ORGAN_VOLUNTARY_POST");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

// ─── Service type label ───────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
  CUSTOM: "Service",
};

function serviceLabel(serviceType: string): string {
  return SERVICE_LABELS[serviceType] ?? serviceType;
}

// ─── Row builder ──────────────────────────────────────────────

function buildRealRow(
  svc: ApiService,
  day: ApiDay,
  slotsByService: Map<string, ApiSlot[]>,
  readingsByDay: Map<string, ApiReading[]>,
): PlanningRow {
  const slots = slotsByService.get(svc.id) ?? [];
  const isEvensong = svc.serviceType === "CHORAL_EVENSONG";
  const dayReadings = readingsByDay.get(svc.liturgicalDayId) ?? [];

  const readings: ReadingsDisplay[] = dayReadings
    .filter((r) => r.lectionary === "PRINCIPAL")
    .map((r) => ({
      ref: r.reference,
      text: r.bookName ?? null,
    }));

  return {
    kind: "real",
    serviceId: svc.id,
    date: day.date,
    serviceType: svc.serviceType,
    time: svc.time,
    liturgicalDayId: svc.liturgicalDayId,
    updatedAt: svc.updatedAt,
    cells: {
      introit: deriveIntroit(slots),
      hymns: deriveHymns(slots),
      setting: deriveSetting(slots, isEvensong),
      psalm: derivePsalm(slots),
      chant: deriveChant(slots),
      respAccl: deriveRespAccl(slots, isEvensong),
      anthem: deriveAnthem(slots),
      voluntary: deriveVoluntary(slots),
      info: cellText(svc.notes ?? ""),
    },
    readings,
  };
}

// ─── Sorting ──────────────────────────────────────────────────

function rowSortKey(row: PlanningRow): string {
  const time = row.time ?? "00:00";
  return `${row.date}T${time}`;
}

// ─── Build rows from API response ────────────────────────────

function buildRowsFromApi(data: ApiResponse, from: string, to: string): PlanningRow[] {
  const daysById = new Map<string, ApiDay>(data.days.map((d) => [d.id, d]));

  const slotsByService = new Map<string, ApiSlot[]>();
  for (const slot of data.slots) {
    const existing = slotsByService.get(slot.serviceId) ?? [];
    existing.push(slot);
    slotsByService.set(slot.serviceId, existing);
  }

  const readingsByDay = new Map<string, ApiReading[]>();
  for (const reading of data.readings) {
    const existing = readingsByDay.get(reading.liturgicalDayId) ?? [];
    existing.push(reading);
    readingsByDay.set(reading.liturgicalDayId, existing);
  }

  const realRows: PlanningRow[] = [];
  for (const svc of data.services) {
    const day = daysById.get(svc.liturgicalDayId);
    if (!day) continue;
    realRows.push(buildRealRow(svc, day, slotsByService, readingsByDay));
  }

  const existingRefs: ExistingServiceRef[] = data.services.map((s) => {
    const day = daysById.get(s.liturgicalDayId);
    return {
      date: day?.date ?? "",
      serviceType: s.serviceType as ExistingServiceRef["serviceType"],
    };
  }).filter((r) => r.date !== "");

  const ghosts = computeGhostRows({ from, to, patterns: data.patterns, existingServices: existingRefs });

  const ghostRows: PlanningRow[] = ghosts.map((g) => ({
    kind: "ghost",
    ghostId: g.ghostId,
    date: g.date,
    serviceType: g.serviceType,
    time: g.time,
    cells: {
      introit: emptyCell(),
      hymns: emptyCell(),
      setting: emptyCell(),
      psalm: emptyCell(),
      chant: emptyCell(),
      respAccl: emptyCell(),
      anthem: emptyCell(),
      voluntary: emptyCell(),
      info: emptyCell(),
    },
    readings: [],
  }));

  return [...realRows, ...ghostRows].sort((a, b) => rowSortKey(a).localeCompare(rowSortKey(b)));
}

// ─── Column order ─────────────────────────────────────────────

const COLUMNS = [
  { key: "introit" as GridColumn, label: "Introit" },
  { key: "hymns" as GridColumn, label: "Hymns" },
  { key: "setting" as GridColumn, label: "Setting" },
  { key: "psalm" as GridColumn, label: "Psalm" },
  { key: "chant" as GridColumn, label: "Chant" },
  { key: "respAccl" as GridColumn, label: "Resp/Accl" },
  { key: "anthem" as GridColumn, label: "Anthem" },
  { key: "voluntary" as GridColumn, label: "Voluntary" },
  { key: "info" as GridColumn, label: "Info" },
];

export const COLUMN_ORDER: GridColumn[] = COLUMNS.map((c) => c.key);

// ─── Component ───────────────────────────────────────────────

interface Props {
  churchId: string;
  from: string;
  to: string;
}

export function PlanningGrid({ churchId, from, to }: Props) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { state, dispatch, getCell } = usePlanningGrid([]);

  // ─── Fetch rows ────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setFetchError(null);

    fetch(`/api/churches/${churchId}/planning?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        const daysById = new Map<string, ApiDay>(data.days.map((d) => [d.id, d]));

        const slotsByService = new Map<string, ApiSlot[]>();
        for (const slot of data.slots) {
          const existing = slotsByService.get(slot.serviceId) ?? [];
          existing.push(slot);
          slotsByService.set(slot.serviceId, existing);
        }

        const readingsByDay = new Map<string, ApiReading[]>();
        for (const reading of data.readings) {
          const existing = readingsByDay.get(reading.liturgicalDayId) ?? [];
          existing.push(reading);
          readingsByDay.set(reading.liturgicalDayId, existing);
        }

        const realRows: PlanningRow[] = [];
        for (const svc of data.services) {
          const day = daysById.get(svc.liturgicalDayId);
          if (!day) continue;
          realRows.push(buildRealRow(svc, day, slotsByService, readingsByDay));
        }

        const existingRefs: ExistingServiceRef[] = data.services.map((s) => {
          const day = daysById.get(s.liturgicalDayId);
          return {
            date: day?.date ?? "",
            serviceType: s.serviceType as ExistingServiceRef["serviceType"],
          };
        }).filter((r) => r.date !== "");

        const ghosts = computeGhostRows({
          from,
          to,
          patterns: data.patterns,
          existingServices: existingRefs,
        });

        const ghostRows: PlanningRow[] = ghosts.map((g) => ({
          kind: "ghost",
          ghostId: g.ghostId,
          date: g.date,
          serviceType: g.serviceType,
          time: g.time,
          cells: {
            introit: emptyCell(),
            hymns: emptyCell(),
            setting: emptyCell(),
            psalm: emptyCell(),
            chant: emptyCell(),
            respAccl: emptyCell(),
            anthem: emptyCell(),
            voluntary: emptyCell(),
            info: emptyCell(),
          },
          readings: [],
        }));

        const allRows = [...realRows, ...ghostRows].sort((a, b) =>
          rowSortKey(a).localeCompare(rowSortKey(b))
        );

        dispatch({ type: "SET_ROWS", rows: allRows });
        setLoading(false);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [churchId, from, to, dispatch]);

  // ─── Persist cell ──────────────────────────────────────────

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

  // ─── Arrow key + undo navigation ──────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Undo
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

      // Copy focused cell (Cmd/Ctrl-C)
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

  // ─── Paste handler: multi-row paste from spreadsheets ─────
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
        // Refetch to get real service ids for ghost rows
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.editing, state.focus, state.rows, churchId, from, to, dispatch, getCell]);

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <DateRangeControls from={from} to={to} />
        <p className="text-sm text-muted-foreground">Loading grid…</p>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <DateRangeControls from={from} to={to} />
        <p className="text-sm text-destructive">Error: {fetchError}</p>
      </>
    );
  }

  if (state.rows.length === 0) {
    return (
      <>
        <DateRangeControls from={from} to={to} />
        <p className="text-sm text-muted-foreground">
          No services found for this period.
        </p>
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <DateRangeControls from={from} to={to} />

      {/* Save status indicator */}
      <div className="text-xs text-muted-foreground h-5 mb-2">
        {state.saveStatus === "saving" && "Saving…"}
        {state.saveStatus === "saved" && "Saved ✓"}
        {state.saveStatus === "error" && <span className="text-destructive">Error saving</span>}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium min-w-[140px]">
              Date / Service
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-left p-2 font-medium whitespace-nowrap">
                {col.label}
              </th>
            ))}
            <th className="text-left p-2 font-medium whitespace-nowrap">
              Readings
            </th>
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
            const readingsText = row.readings
              .map((r) => (r.text ? `${r.ref} (${r.text})` : r.ref))
              .join("; ");

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
                <td className="p-2 align-top max-w-[200px]">
                  <span className="block truncate text-xs text-muted-foreground">
                    {readingsText}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
