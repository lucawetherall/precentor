import { describe, it, expect } from "vitest";
import {
  resolveSheetMode,
  resolveServiceTemplate,
  resolveEucharisticPrayer,
} from "../build-sheet-data";
import { CW_EUCHARIST_ORDER_ONE } from "@/data/liturgy/cw-eucharist-order-one";
import { BCP_EVENSONG } from "@/data/liturgy/bcp-evensong";
import { EUCHARISTIC_PRAYER_A, EUCHARISTIC_PRAYER_H } from "@/data/liturgy/eucharistic-prayers";

describe("resolveSheetMode", () => {
  it("returns summary by default", () => {
    expect(resolveSheetMode(null, null)).toBe("summary");
  });

  it("returns DB value when no override", () => {
    expect(resolveSheetMode("booklet", null)).toBe("booklet");
  });

  it("returns summary for unknown DB value", () => {
    expect(resolveSheetMode("invalid", null)).toBe("summary");
  });

  it("overrides with query param", () => {
    expect(resolveSheetMode("summary", "booklet")).toBe("booklet");
    expect(resolveSheetMode("booklet", "summary")).toBe("summary");
  });

  it("ignores invalid query param", () => {
    expect(resolveSheetMode("booklet", "invalid")).toBe("booklet");
  });
});

describe("resolveServiceTemplate", () => {
  it("maps SUNG_EUCHARIST to CW Order One", () => {
    expect(resolveServiceTemplate("SUNG_EUCHARIST")).toBe(CW_EUCHARIST_ORDER_ONE);
  });

  it("maps SAID_EUCHARIST to CW Order One", () => {
    expect(resolveServiceTemplate("SAID_EUCHARIST")).toBe(CW_EUCHARIST_ORDER_ONE);
  });

  it("maps CHORAL_EVENSONG to BCP Evensong", () => {
    expect(resolveServiceTemplate("CHORAL_EVENSONG")).toBe(BCP_EVENSONG);
  });

  it("falls back to CW Order One for unknown types", () => {
    expect(resolveServiceTemplate("CUSTOM")).toBe(CW_EUCHARIST_ORDER_ONE);
  });
});

describe("resolveEucharisticPrayer", () => {
  it("returns undefined for null", () => {
    expect(resolveEucharisticPrayer(null)).toBeUndefined();
  });

  it("maps 'A' to Prayer A", () => {
    expect(resolveEucharisticPrayer("A")).toBe(EUCHARISTIC_PRAYER_A);
  });

  it("maps 'H' to Prayer H", () => {
    expect(resolveEucharisticPrayer("H")).toBe(EUCHARISTIC_PRAYER_H);
  });

  it("handles lowercase keys", () => {
    expect(resolveEucharisticPrayer("a")).toBe(EUCHARISTIC_PRAYER_A);
  });

  it("handles eucharistic-prayer-a format", () => {
    expect(resolveEucharisticPrayer("eucharistic-prayer-a")).toBe(EUCHARISTIC_PRAYER_A);
  });

  it("returns undefined for invalid key", () => {
    expect(resolveEucharisticPrayer("Z")).toBeUndefined();
  });
});
