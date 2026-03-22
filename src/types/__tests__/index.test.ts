import { describe, it, expect } from "vitest";
import {
  EUCHARIST_SLOTS,
  EVENSONG_SLOTS,
  MUSIC_SLOT_LABELS,
  SERVICE_TYPE_LABELS,
} from "../index";
import type { MusicSlotType, ServiceType } from "../index";

describe("EUCHARIST_SLOTS", () => {
  it("has 12 entries", () => {
    expect(EUCHARIST_SLOTS).toHaveLength(12);
  });

  it("starts with ORGAN_VOLUNTARY_PRE and ends with ORGAN_VOLUNTARY_POST", () => {
    expect(EUCHARIST_SLOTS[0]).toBe("ORGAN_VOLUNTARY_PRE");
    expect(EUCHARIST_SLOTS[EUCHARIST_SLOTS.length - 1]).toBe("ORGAN_VOLUNTARY_POST");
  });

  it("contains exactly 5 HYMN slots", () => {
    const hymnCount = EUCHARIST_SLOTS.filter((slot) => slot === "HYMN").length;
    expect(hymnCount).toBe(5);
  });
});

describe("EVENSONG_SLOTS", () => {
  it("has 9 entries", () => {
    expect(EVENSONG_SLOTS).toHaveLength(9);
  });

  it("starts with ORGAN_VOLUNTARY_PRE and ends with ORGAN_VOLUNTARY_POST", () => {
    expect(EVENSONG_SLOTS[0]).toBe("ORGAN_VOLUNTARY_PRE");
    expect(EVENSONG_SLOTS[EVENSONG_SLOTS.length - 1]).toBe("ORGAN_VOLUNTARY_POST");
  });

  it("contains exactly 2 HYMN slots", () => {
    const hymnCount = EVENSONG_SLOTS.filter((slot) => slot === "HYMN").length;
    expect(hymnCount).toBe(2);
  });
});

describe("MUSIC_SLOT_LABELS", () => {
  it("has a label for every MusicSlotType value", () => {
    const allSlotTypes: MusicSlotType[] = [
      "HYMN",
      "PSALM",
      "ANTHEM",
      "MASS_SETTING_GLORIA",
      "MASS_SETTING_SANCTUS",
      "MASS_SETTING_AGNUS",
      "MASS_SETTING_GLOBAL",
      "ORGAN_VOLUNTARY_PRE",
      "ORGAN_VOLUNTARY_POST",
      "ORGAN_VOLUNTARY_OFFERTORY",
      "CANTICLE_MAGNIFICAT",
      "CANTICLE_NUNC_DIMITTIS",
      "RESPONSES",
      "GOSPEL_ACCLAMATION",
      "OTHER",
    ];

    for (const slotType of allSlotTypes) {
      expect(MUSIC_SLOT_LABELS[slotType]).toBeDefined();
      expect(typeof MUSIC_SLOT_LABELS[slotType]).toBe("string");
    }
  });
});

describe("SERVICE_TYPE_LABELS", () => {
  it("has a label for every ServiceType value", () => {
    const allServiceTypes: ServiceType[] = [
      "SUNG_EUCHARIST",
      "CHORAL_EVENSONG",
      "SAID_EUCHARIST",
      "CHORAL_MATINS",
      "FAMILY_SERVICE",
      "COMPLINE",
      "CUSTOM",
    ];

    for (const serviceType of allServiceTypes) {
      expect(SERVICE_TYPE_LABELS[serviceType]).toBeDefined();
      expect(typeof SERVICE_TYPE_LABELS[serviceType]).toBe("string");
    }
  });
});
