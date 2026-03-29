import { describe, it, expect } from "vitest";
import { reducer, takeSnapshot, type ServiceEditorState, type ServiceSettings, type SheetData } from "../use-service-editor";

describe("reducer: SET_SETTINGS vs SNAPSHOT_AND_UPDATE_SETTINGS", () => {
  const baseSettings: ServiceSettings = {
    sheetMode: "summary",
    eucharisticPrayer: null,
    eucharisticPrayerId: null,
    includeReadingText: true,
    choirStatus: "CHOIR_REQUIRED",
    defaultMassSettingId: null,
    collectId: null,
    collectOverride: null,
  };

  const baseState: ServiceEditorState = {
    sections: [],
    settings: baseSettings,
    musicSlots: new Map(),
    saveStatus: "idle",
    undoStack: [],
    redoStack: [],
    sheetData: null,
  };

  it("SNAPSHOT_AND_UPDATE_SETTINGS pushes undo entry", () => {
    const updated = { ...baseSettings, defaultMassSettingId: "new-id" };
    const next = reducer(baseState, { type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: updated });
    expect(next.settings.defaultMassSettingId).toBe("new-id");
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].settings.defaultMassSettingId).toBeNull();
  });

  it("ROLLBACK restores snapshot", () => {
    const snapshot = takeSnapshot(baseState);
    const modified = { ...baseState, settings: { ...baseSettings, defaultMassSettingId: "new-id" } };
    const rolled = reducer(modified, { type: "ROLLBACK", snapshot });
    expect(rolled.settings.defaultMassSettingId).toBeNull();
  });

  it("second SNAPSHOT_AND_UPDATE_SETTINGS preserves first rollback target in stack", () => {
    const first = reducer(baseState, { type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: { ...baseSettings, defaultMassSettingId: "first" } });
    const second = reducer(first, { type: "SNAPSHOT_AND_UPDATE_SETTINGS", settings: { ...baseSettings, defaultMassSettingId: "second" } });
    expect(second.undoStack[0].settings.defaultMassSettingId).toBeNull();
    expect(second.undoStack).toHaveLength(2);
  });
});

describe("reducer: SNAPSHOT_AND_UPDATE_SLOT", () => {
  const baseSettings: ServiceSettings = {
    sheetMode: "summary",
    eucharisticPrayer: null,
    eucharisticPrayerId: null,
    includeReadingText: true,
    choirStatus: "CHOIR_REQUIRED",
    defaultMassSettingId: null,
    collectId: null,
    collectOverride: null,
  };

  it("updates existing slot and pushes to undo stack", () => {
    const slots = new Map([["slot-1", {
      id: "slot-1", serviceId: "svc-1", slotType: "HYMN", positionOrder: 1,
      hymnId: null, anthemId: null, massSettingId: null, canticleSettingId: null,
      responsesSettingId: null, freeText: null, notes: null, verseCount: null, selectedVerses: null,
    }]]);
    const state: ServiceEditorState = {
      sections: [], settings: baseSettings, musicSlots: slots,
      saveStatus: "idle", undoStack: [], redoStack: [], sheetData: null,
    };

    const next = reducer(state, {
      type: "SNAPSHOT_AND_UPDATE_SLOT",
      slotId: "slot-1",
      fields: { hymnId: "hymn-123" },
    });
    expect(next.musicSlots.get("slot-1")?.hymnId).toBe("hymn-123");
    expect(next.undoStack).toHaveLength(1);
  });

  it("does NOT push to undo stack when slot does not exist", () => {
    const state: ServiceEditorState = {
      sections: [], settings: baseSettings, musicSlots: new Map(),
      saveStatus: "idle", undoStack: [], redoStack: [], sheetData: null,
    };

    const next = reducer(state, {
      type: "SNAPSHOT_AND_UPDATE_SLOT",
      slotId: "nonexistent-slot",
      fields: { hymnId: "hymn-123" },
    });
    expect(next.undoStack).toHaveLength(0);
    expect(next).toBe(state); // Should return exact same reference
  });
});

describe("reducer: UNDO / REDO", () => {
  const baseSettings: ServiceSettings = {
    sheetMode: "summary",
    eucharisticPrayer: null,
    eucharisticPrayerId: null,
    includeReadingText: true,
    choirStatus: "CHOIR_REQUIRED",
    defaultMassSettingId: null,
    collectId: null,
    collectOverride: null,
  };

  const baseState: ServiceEditorState = {
    sections: [], settings: baseSettings, musicSlots: new Map(),
    saveStatus: "idle", undoStack: [], redoStack: [], sheetData: null,
  };

  it("UNDO with empty stack is a no-op", () => {
    const next = reducer(baseState, { type: "UNDO" });
    expect(next).toBe(baseState);
  });

  it("REDO with empty stack is a no-op", () => {
    const next = reducer(baseState, { type: "REDO" });
    expect(next).toBe(baseState);
  });

  it("UNDO restores previous state and pushes current to redo stack", () => {
    const modified = reducer(baseState, {
      type: "SNAPSHOT_AND_UPDATE_SETTINGS",
      settings: { ...baseSettings, defaultMassSettingId: "new-id" },
    });
    expect(modified.undoStack).toHaveLength(1);

    const undone = reducer(modified, { type: "UNDO" });
    expect(undone.settings.defaultMassSettingId).toBeNull();
    expect(undone.undoStack).toHaveLength(0);
    expect(undone.redoStack).toHaveLength(1);
  });

  it("REDO restores undone state", () => {
    const modified = reducer(baseState, {
      type: "SNAPSHOT_AND_UPDATE_SETTINGS",
      settings: { ...baseSettings, defaultMassSettingId: "new-id" },
    });
    const undone = reducer(modified, { type: "UNDO" });
    const redone = reducer(undone, { type: "REDO" });
    expect(redone.settings.defaultMassSettingId).toBe("new-id");
    expect(redone.undoStack).toHaveLength(1);
    expect(redone.redoStack).toHaveLength(0);
  });

  it("undo stack is capped at MAX_UNDO (20) entries", () => {
    let state = baseState;
    for (let i = 0; i < 25; i++) {
      state = reducer(state, {
        type: "SNAPSHOT_AND_UPDATE_SETTINGS",
        settings: { ...baseSettings, defaultMassSettingId: `id-${i}` },
      });
    }
    expect(state.undoStack.length).toBeLessThanOrEqual(20);
  });

  it("new change after undo clears redo stack", () => {
    const modified = reducer(baseState, {
      type: "SNAPSHOT_AND_UPDATE_SETTINGS",
      settings: { ...baseSettings, defaultMassSettingId: "first" },
    });
    const undone = reducer(modified, { type: "UNDO" });
    expect(undone.redoStack).toHaveLength(1);

    const newChange = reducer(undone, {
      type: "SNAPSHOT_AND_UPDATE_SETTINGS",
      settings: { ...baseSettings, defaultMassSettingId: "second" },
    });
    expect(newChange.redoStack).toHaveLength(0);
  });
});

describe("reducer: SET_SAVE_STATUS and SET_SHEET_DATA", () => {
  const baseSettings: ServiceSettings = {
    sheetMode: "summary",
    eucharisticPrayer: null,
    eucharisticPrayerId: null,
    includeReadingText: true,
    choirStatus: "CHOIR_REQUIRED",
    defaultMassSettingId: null,
    collectId: null,
    collectOverride: null,
  };

  const baseState: ServiceEditorState = {
    sections: [], settings: baseSettings, musicSlots: new Map(),
    saveStatus: "idle", undoStack: [], redoStack: [], sheetData: null,
  };

  it("SET_SAVE_STATUS updates save status", () => {
    const next = reducer(baseState, { type: "SET_SAVE_STATUS", status: "saving" });
    expect(next.saveStatus).toBe("saving");
  });

  it("SET_SHEET_DATA updates sheet data", () => {
    const mockData = { mode: "summary" } as unknown as SheetData;
    const next = reducer(baseState, { type: "SET_SHEET_DATA", data: mockData });
    expect(next.sheetData).toBe(mockData);
  });

  it("SET_SHEET_DATA with null clears sheet data", () => {
    const withData = { ...baseState, sheetData: { mode: "summary" } as unknown as SheetData };
    const next = reducer(withData, { type: "SET_SHEET_DATA", data: null });
    expect(next.sheetData).toBeNull();
  });
});
