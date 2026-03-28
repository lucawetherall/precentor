import { describe, it, expect } from "vitest";
import { reducer, takeSnapshot, type ServiceEditorState, type ServiceSettings } from "../use-service-editor";

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
