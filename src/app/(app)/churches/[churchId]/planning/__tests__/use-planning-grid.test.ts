import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlanningGrid } from "../use-planning-grid";
import type { PlanningRow, CellDisplay } from "../types";

const emptyCell: CellDisplay = { displayText: "" };

function realRow(serviceId: string, updatedAt: string): PlanningRow {
  return {
    kind: "real",
    serviceId,
    date: "2026-06-07",
    serviceType: "SUNG_EUCHARIST",
    time: null,
    updatedAt,
    cells: {
      introit: emptyCell,
      hymns: emptyCell,
      setting: emptyCell,
      psalm: emptyCell,
      chant: emptyCell,
      respAccl: emptyCell,
      anthem: emptyCell,
      voluntary: emptyCell,
      info: emptyCell,
    },
    readings: [],
  };
}

describe("usePlanningGrid reducer — SET_ROW_UPDATED_AT", () => {
  it("refreshes the optimistic-concurrency token for the matching real row only", () => {
    const { result } = renderHook(() =>
      usePlanningGrid([realRow("svc-1", "T0"), realRow("svc-2", "T0")])
    );

    act(() => {
      result.current.dispatch({
        type: "SET_ROW_UPDATED_AT",
        serviceId: "svc-1",
        updatedAt: "T1",
      });
    });

    const rows = result.current.state.rows;
    // The saved row advances to the new token; the untouched row is unchanged,
    // so a follow-up edit to svc-1 sends T1 (not the stale T0) and avoids a 409.
    expect(rows.find((r) => r.serviceId === "svc-1")?.updatedAt).toBe("T1");
    expect(rows.find((r) => r.serviceId === "svc-2")?.updatedAt).toBe("T0");
  });
});
