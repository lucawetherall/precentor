import { useReducer, useCallback, useRef, useEffect } from "react";
import type { ServiceSection } from "./section-row";
import type { BookletServiceSheetData, SummaryServiceSheetData } from "@/types/service-sheet";

export type SheetData = BookletServiceSheetData | SummaryServiceSheetData;

// ─── Types ──────────────────────────────────────────────────

export interface ServiceSettings {
  sheetMode: string;
  eucharisticPrayer: string | null;
  eucharisticPrayerId: string | null;
  includeReadingText: boolean;
  defaultMassSettingId: string | null;
  collectId: string | null;
  collectOverride: string | null;
}

export interface MusicSlot {
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
  notes: string | null;
  verseCount: number | null;
  selectedVerses: number[] | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ServiceEditorSnapshot {
  sections: ServiceSection[];
  settings: ServiceSettings;
  musicSlots: Map<string, MusicSlot>;
}

export interface ServiceEditorState {
  sections: ServiceSection[];
  settings: ServiceSettings;
  musicSlots: Map<string, MusicSlot>;
  saveStatus: SaveStatus;
  undoStack: ServiceEditorSnapshot[];
  redoStack: ServiceEditorSnapshot[];
  sheetData: SheetData | null;
}

// ─── Actions ────────────────────────────────────────────────

type ServiceEditorAction =
  | { type: "SET_SECTIONS"; sections: ServiceSection[] }
  | { type: "SET_SETTINGS"; settings: ServiceSettings }
  | { type: "SET_MUSIC_SLOTS"; musicSlots: Map<string, MusicSlot> }
  | { type: "SET_SAVE_STATUS"; status: SaveStatus }
  | { type: "SET_SHEET_DATA"; data: SheetData | null }
  | { type: "SNAPSHOT_AND_UPDATE_SECTIONS"; sections: ServiceSection[] }
  | { type: "SNAPSHOT_AND_UPDATE_SETTINGS"; settings: ServiceSettings }
  | { type: "SNAPSHOT_AND_UPDATE_SLOT"; slotId: string; fields: Partial<MusicSlot> }
  | { type: "ROLLBACK"; snapshot: ServiceEditorSnapshot }
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_UNDO = 20;

export function takeSnapshot(state: ServiceEditorState): ServiceEditorSnapshot {
  return {
    sections: state.sections,
    settings: state.settings,
    musicSlots: new Map(state.musicSlots),
  };
}

function pushUndo(
  stack: ServiceEditorSnapshot[],
  snapshot: ServiceEditorSnapshot
): ServiceEditorSnapshot[] {
  const next = [...stack, snapshot];
  if (next.length > MAX_UNDO) next.shift();
  return next;
}

export function reducer(
  state: ServiceEditorState,
  action: ServiceEditorAction
): ServiceEditorState {
  switch (action.type) {
    case "SET_SECTIONS":
      return { ...state, sections: action.sections };

    case "SET_SETTINGS":
      return { ...state, settings: action.settings };

    case "SET_MUSIC_SLOTS":
      return { ...state, musicSlots: action.musicSlots };

    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.status };

    case "SET_SHEET_DATA":
      return { ...state, sheetData: action.data };

    case "SNAPSHOT_AND_UPDATE_SECTIONS": {
      const snapshot = takeSnapshot(state);
      return {
        ...state,
        sections: action.sections,
        undoStack: pushUndo(state.undoStack, snapshot),
        redoStack: [],
      };
    }

    case "SNAPSHOT_AND_UPDATE_SETTINGS": {
      const snapshot = takeSnapshot(state);
      return {
        ...state,
        settings: action.settings,
        undoStack: pushUndo(state.undoStack, snapshot),
        redoStack: [],
      };
    }

    case "SNAPSHOT_AND_UPDATE_SLOT": {
      const newSlots = new Map(state.musicSlots);
      const existing = newSlots.get(action.slotId);
      if (!existing) {
        // Slot doesn't exist — no-op to avoid misleading undo entries
        return state;
      }
      const snapshot = takeSnapshot(state);
      newSlots.set(action.slotId, { ...existing, ...action.fields });
      return {
        ...state,
        musicSlots: newSlots,
        undoStack: pushUndo(state.undoStack, snapshot),
        redoStack: [],
      };
    }

    case "ROLLBACK":
      return {
        ...state,
        sections: action.snapshot.sections,
        settings: action.snapshot.settings,
        musicSlots: action.snapshot.musicSlots,
      };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const undoStack = [...state.undoStack];
      const snapshot = undoStack.pop()!;
      const currentSnapshot = takeSnapshot(state);
      return {
        ...state,
        sections: snapshot.sections,
        settings: snapshot.settings,
        musicSlots: snapshot.musicSlots,
        undoStack,
        redoStack: pushUndo(state.redoStack, currentSnapshot),
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const redoStack = [...state.redoStack];
      const snapshot = redoStack.pop()!;
      const currentSnapshot = takeSnapshot(state);
      return {
        ...state,
        sections: snapshot.sections,
        settings: snapshot.settings,
        musicSlots: snapshot.musicSlots,
        redoStack,
        undoStack: pushUndo(state.undoStack, currentSnapshot),
      };
    }

    default:
      return state;
  }
}

// ─── Fetch helper ───────────────────────────────────────────

async function apiFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

// ─── Hook ───────────────────────────────────────────────────

export interface UseServiceEditorProps {
  serviceId: string;
  churchId: string;
  initialSections: ServiceSection[];
  initialSettings: ServiceSettings;
  initialSlots: MusicSlot[];
}

export function useServiceEditorReducer({
  serviceId,
  churchId,
  initialSections,
  initialSettings,
  initialSlots,
}: UseServiceEditorProps) {
  const initialSlotsMap = new Map<string, MusicSlot>();
  for (const slot of initialSlots) {
    initialSlotsMap.set(slot.id, slot);
  }

  const [state, dispatch] = useReducer(reducer, {
    sections: initialSections,
    settings: initialSettings,
    musicSlots: initialSlotsMap,
    saveStatus: "idle" as SaveStatus,
    undoStack: [],
    redoStack: [],
    sheetData: null,
  });

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const baseUrl = `/api/churches/${churchId}/services/${serviceId}`;

  // Helper: set saved then auto-reset to idle after 2s
  const markSaved = useCallback(() => {
    dispatch({ type: "SET_SAVE_STATUS", status: "saved" });
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      dispatch({ type: "SET_SAVE_STATUS", status: "idle" });
    }, 2000);
  }, []);

  // Helper: run a mutation with optimistic update + rollback on error
  const runMutation = useCallback(
    async (apiCall: () => Promise<Response>, rollbackSnapshot: ServiceEditorSnapshot) => {
      dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
      try {
        const res = await apiCall();
        if (!res.ok) {
          dispatch({ type: "ROLLBACK", snapshot: rollbackSnapshot });
          dispatch({ type: "SET_SAVE_STATUS", status: "error" });
          return false;
        }
        markSaved();
        return true;
      } catch {
        dispatch({ type: "ROLLBACK", snapshot: rollbackSnapshot });
        dispatch({ type: "SET_SAVE_STATUS", status: "error" });
        return false;
      }
    },
    [markSaved]
  );

  // We need access to the current state inside async callbacks.
  // Use a ref so the closure always has the latest state.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ── Mutation functions ──────────────────────────────────────

  const updateSection = useCallback(
    async (sectionId: string, fields: Partial<ServiceSection>) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      const updated = current.sections.map((s) =>
        s.id === sectionId ? { ...s, ...fields } : s
      );
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SECTIONS", sections: updated });
      await runMutation(
        () =>
          apiFetch(`${baseUrl}/sections/${sectionId}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          }),
        snapshot
      );
    },
    [baseUrl, runMutation]
  );

  const reorderSections = useCallback(
    async (orderedIds: string[]) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      const sectionMap = new Map(current.sections.map((s) => [s.id, s]));
      const reordered = orderedIds
        .map((id, i) => {
          const s = sectionMap.get(id);
          return s ? { ...s, positionOrder: i + 1 } : null;
        })
        .filter((s): s is ServiceSection => s !== null);
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SECTIONS", sections: reordered });
      await runMutation(
        () =>
          apiFetch(`${baseUrl}/sections/reorder`, {
            method: "PUT",
            body: JSON.stringify({ sectionIds: orderedIds }),
          }),
        snapshot
      );
    },
    [baseUrl, runMutation]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      const updated = current.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, positionOrder: i + 1 }));
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SECTIONS", sections: updated });
      await runMutation(
        () =>
          apiFetch(`${baseUrl}/sections/${sectionId}`, {
            method: "DELETE",
          }),
        snapshot
      );
    },
    [baseUrl, runMutation]
  );

  const addSection = useCallback(
    async (section: Omit<ServiceSection, "id">) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      // Optimistic: add with a temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimistic: ServiceSection = {
        ...section,
        id: tempId,
      };
      dispatch({
        type: "SNAPSHOT_AND_UPDATE_SECTIONS",
        sections: [...current.sections, optimistic],
      });
      dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
      try {
        const res = await apiFetch(`${baseUrl}/sections`, {
          method: "POST",
          body: JSON.stringify(section),
        });
        if (!res.ok) {
          dispatch({ type: "ROLLBACK", snapshot });
          dispatch({ type: "SET_SAVE_STATUS", status: "error" });
          return null;
        }
        const created: ServiceSection = await res.json();
        // Replace temp ID with real ID — guard against concurrent edits
        const currentState = stateRef.current;
        const tempExists = currentState.sections.some((s) => s.id === tempId);
        if (tempExists) {
          const replaced = currentState.sections.map((s) =>
            s.id === tempId ? created : s
          );
          dispatch({ type: "SET_SECTIONS", sections: replaced });
        } else {
          // Temp section was modified/removed — refetch from server
          try {
            const res2 = await apiFetch(`${baseUrl}/sections`, { method: "GET" });
            if (res2.ok) {
              const fetched: ServiceSection[] = await res2.json();
              dispatch({ type: "SET_SECTIONS", sections: fetched });
            }
          } catch { /* best-effort */ }
        }
        markSaved();
        return created;
      } catch {
        dispatch({ type: "ROLLBACK", snapshot });
        dispatch({ type: "SET_SAVE_STATUS", status: "error" });
        return null;
      }
    },
    [baseUrl, markSaved]
  );

  const updateSettings = useCallback(
    async (fields: Partial<ServiceSettings>) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      const updated = { ...current.settings, ...fields };
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: updated });
      await runMutation(
        () =>
          apiFetch(`${baseUrl}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          }),
        snapshot
      );
    },
    [baseUrl, runMutation]
  );

  const debouncedUpdateSettings = useCallback(
    (fields: Partial<ServiceSettings>) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);           // captured BEFORE dispatch
      const updated = { ...current.settings, ...fields };
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: updated });

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        runMutation(
          () =>
            apiFetch(`${baseUrl}`, {
              method: "PATCH",
              body: JSON.stringify(fields),
            }),
          snapshot                                      // closed over, always correct
        );
      }, 500);
    },
    [baseUrl, runMutation]
  );

  const updateSlot = useCallback(
    async (slotId: string, fields: Partial<MusicSlot>) => {
      const current = stateRef.current;
      const snapshot = takeSnapshot(current);
      dispatch({ type: "SNAPSHOT_AND_UPDATE_SLOT", slotId, fields });
      await runMutation(
        () =>
          apiFetch(`${baseUrl}/slots/${slotId}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          }),
        snapshot
      );
    },
    [baseUrl, runMutation]
  );

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const setSheetData = useCallback((data: SheetData | null) => {
    dispatch({ type: "SET_SHEET_DATA", data });
  }, []);

  // Re-fetch sections from the server and update state.
  // Used when an external component (e.g. AddSectionPicker) mutates sections
  // outside the context's control.
  const refreshSections = useCallback(async () => {
    try {
      const res = await apiFetch(`${baseUrl}/sections`, { method: "GET" });
      if (res.ok) {
        const fetched: ServiceSection[] = await res.json();
        dispatch({ type: "SET_SECTIONS", sections: fetched });
      }
    } catch (err) {
      console.error("Failed to refresh sections", err);
    }
  }, [baseUrl]);

  return {
    // State
    sections: state.sections,
    settings: state.settings,
    musicSlots: state.musicSlots,
    saveStatus: state.saveStatus,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    sheetData: state.sheetData,

    // Mutations
    updateSection,
    reorderSections,
    deleteSection,
    addSection,
    updateSettings,
    debouncedUpdateSettings,
    updateSlot,
    undo,
    redo,
    refreshSections,
    setSheetData,
  };
}

export type ServiceEditorValue = ReturnType<typeof useServiceEditorReducer>;
