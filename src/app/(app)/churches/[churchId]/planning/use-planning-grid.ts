"use client";

import { useReducer, useCallback } from "react";
import type { PlanningRow, GridColumn, CellDisplay } from "./types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface State {
  rows: PlanningRow[];
  dirty: Record<string, Partial<Record<GridColumn, CellDisplay>>>;
  focus: { rowKey: string; column: GridColumn } | null;
  editing: boolean;
  saveStatus: SaveStatus;
  lastEdit: { rowKey: string; column: GridColumn; previous: CellDisplay } | null;
}

type Action =
  | { type: "SET_ROWS"; rows: PlanningRow[] }
  | { type: "FOCUS"; rowKey: string; column: GridColumn }
  | { type: "ENTER_EDIT" }
  | { type: "CANCEL_EDIT" }
  | { type: "COMMIT_CELL"; rowKey: string; column: GridColumn; value: CellDisplay; previous: CellDisplay }
  | { type: "UNDO" }
  | { type: "SAVE_STATUS"; status: SaveStatus }
  | { type: "REPLACE_ROW_ID"; ghostId: string; serviceId: string; updatedAt: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROWS": return { ...state, rows: action.rows };
    case "FOCUS": return { ...state, focus: { rowKey: action.rowKey, column: action.column }, editing: false };
    case "ENTER_EDIT": return state.focus ? { ...state, editing: true } : state;
    case "CANCEL_EDIT": return { ...state, editing: false };
    case "COMMIT_CELL": {
      const existing = state.dirty[action.rowKey] ?? {};
      return {
        ...state,
        dirty: { ...state.dirty, [action.rowKey]: { ...existing, [action.column]: action.value } },
        editing: false,
        lastEdit: { rowKey: action.rowKey, column: action.column, previous: action.previous },
      };
    }
    case "UNDO": {
      if (!state.lastEdit) return state;
      const { rowKey, column, previous } = state.lastEdit;
      const existing = state.dirty[rowKey] ?? {};
      return {
        ...state,
        dirty: { ...state.dirty, [rowKey]: { ...existing, [column]: previous } },
        lastEdit: null,
      };
    }
    case "SAVE_STATUS": return { ...state, saveStatus: action.status };
    case "REPLACE_ROW_ID": {
      const nextRows = state.rows.map((r) =>
        r.kind === "ghost" && r.ghostId === action.ghostId
          ? { ...r, kind: "real" as const, serviceId: action.serviceId, ghostId: undefined, updatedAt: action.updatedAt }
          : r
      );
      return { ...state, rows: nextRows };
    }
    default: return state;
  }
}

export function rowKey(row: PlanningRow): string {
  return row.kind === "real" ? `real:${row.serviceId}` : row.ghostId!;
}

export function usePlanningGrid(initialRows: PlanningRow[]) {
  const [state, dispatch] = useReducer(reducer, {
    rows: initialRows,
    dirty: {},
    focus: null,
    editing: false,
    saveStatus: "idle",
    lastEdit: null,
  });

  const getCell = useCallback((row: PlanningRow, column: GridColumn): CellDisplay => {
    const key = rowKey(row);
    return state.dirty[key]?.[column] ?? row.cells[column];
  }, [state.dirty]);

  return { state, dispatch, getCell };
}
