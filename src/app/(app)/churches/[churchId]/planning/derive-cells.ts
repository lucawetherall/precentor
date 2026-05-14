import type { ApiSlot } from "./api-types";
import type { CellDisplay } from "./types";

function emptyCell(): CellDisplay {
  return { displayText: "" };
}

function cellText(text: string): CellDisplay {
  return { displayText: text };
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

export function deriveIntroit(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "INTROIT");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

export function deriveHymns(slots: ApiSlot[]): CellDisplay {
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

export function deriveSetting(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const magSlot = slots.find((s) => s.slotType === "CANTICLE_MAGNIFICAT");
    if (!magSlot) return emptyCell();
    if (magSlot.canticleSettingName) {
      return cellText(joinParts(magSlot.canticleSettingName, magSlot.canticleSettingComposer));
    }
    if (magSlot.freeText) return cellText(magSlot.freeText);
    return emptyCell();
  }
  const globalSlot = slots.find((s) => s.slotType === "MASS_SETTING_GLOBAL");
  if (globalSlot) {
    if (globalSlot.massSettingName) {
      return cellText(joinParts(globalSlot.massSettingName, globalSlot.massSettingComposer));
    }
    if (globalSlot.freeText) return cellText(globalSlot.freeText);
  }
  return emptyCell();
}

export function derivePsalm(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (slot?.freeText) return cellText(slot.freeText);
  return emptyCell();
}

export function deriveChant(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (slot?.psalmChant) return cellText(slot.psalmChant);
  return emptyCell();
}

export function deriveRespAccl(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const slot = slots.find((s) => s.slotType === "RESPONSES");
    if (!slot) return emptyCell();
    if (slot.responsesSettingName) {
      return cellText(joinParts(slot.responsesSettingName, slot.responsesSettingComposer));
    }
    if (slot.freeText) return cellText(slot.freeText);
    return emptyCell();
  }
  const slot = slots.find((s) => s.slotType === "GOSPEL_ACCLAMATION");
  if (slot?.freeText) return cellText(slot.freeText);
  return emptyCell();
}

export function deriveAnthem(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ANTHEM");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

export function deriveVoluntary(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ORGAN_VOLUNTARY_POST");
  if (slot?.freeText) return cellText(slot.freeText);
  return emptyCell();
}

const SERVICE_LABELS: Record<string, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
  CUSTOM: "Service",
};

export function serviceLabel(serviceType: string): string {
  return SERVICE_LABELS[serviceType] ?? serviceType;
}

export { emptyCell, cellText };
