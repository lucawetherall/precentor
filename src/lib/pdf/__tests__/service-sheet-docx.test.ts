import { describe, it, expect } from "vitest";
import { generateBookletDocx, generateSummaryDocx } from "../service-sheet-docx";
import type { BookletServiceSheetData, SummaryServiceSheetData } from "@/types/service-sheet";
import { DEFAULT_TEMPLATE_LAYOUT } from "@/types/service-sheet";
import { CW_EUCHARIST_ORDER_ONE } from "@/data/liturgy/cw-eucharist-order-one";

const summaryData: SummaryServiceSheetData = {
  mode: "summary",
  churchName: "Test Church",
  serviceType: "SUNG_EUCHARIST",
  date: "2026-03-22",
  liturgicalName: "Third Sunday of Lent",
  season: "LENT",
  colour: "PURPLE",
  collect: "Test collect prayer text.",
  postCommunion: "Test post communion prayer text.",
  readings: [
    { position: "NEW_TESTAMENT", reference: "1 Corinthians 1:18-25" },
  ],
  musicSlots: [
    {
      slotType: "HYMN",
      positionOrder: 0,
      label: "Hymn",
      value: "Guide me O thou great Redeemer",
      hymn: { book: "NEH", number: 368, firstLine: "Guide me O thou great Redeemer", tuneName: "CWM RHONDDA" },
    },
  ],
  templateLayout: DEFAULT_TEMPLATE_LAYOUT,
};

const bookletData: BookletServiceSheetData = {
  mode: "booklet",
  churchName: "Test Church",
  serviceType: "SUNG_EUCHARIST",
  date: "2026-03-22",
  liturgicalName: "Third Sunday of Lent",
  season: "LENT",
  colour: "PURPLE",
  template: CW_EUCHARIST_ORDER_ONE,
  liturgicalOverrides: {},
  readings: [],
  includeReadingText: false,
  musicSlots: [],
  templateLayout: DEFAULT_TEMPLATE_LAYOUT,
};

describe("generateSummaryDocx", () => {
  it("produces a non-empty buffer", async () => {
    const buffer = await generateSummaryDocx(summaryData);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("produces a valid DOCX (PK zip header)", async () => {
    const buffer = await generateSummaryDocx(summaryData);
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });
});

describe("generateBookletDocx", () => {
  it("produces a non-empty buffer", async () => {
    const buffer = await generateBookletDocx(bookletData);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("produces a valid DOCX (PK zip header)", async () => {
    const buffer = await generateBookletDocx(bookletData);
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });
});
