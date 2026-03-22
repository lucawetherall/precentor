import { describe, it, expect } from "vitest";
import { BCP_EVENSONG } from "../bcp-evensong";

describe("BCP Evensong template", () => {
  it("has correct service type and rite", () => {
    expect(BCP_EVENSONG.serviceType).toBe("CHORAL_EVENSONG");
    expect(BCP_EVENSONG.rite).toBe("BCP Evening Prayer");
  });

  it("has unique section IDs", () => {
    const ids = BCP_EVENSONG.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains key evensong sections", () => {
    const ids = BCP_EVENSONG.sections.map((s) => s.id);
    expect(ids).toContain("evensong.preces");
    expect(ids).toContain("evensong.psalm");
    expect(ids).toContain("evensong.magnificat");
    expect(ids).toContain("evensong.nunc-dimittis");
    expect(ids).toContain("evensong.creed");
    expect(ids).toContain("evensong.collect");
    expect(ids).toContain("evensong.anthem");
  });

  it("has music slot types for key musical sections", () => {
    const slotTypes = BCP_EVENSONG.sections
      .filter((s) => s.musicSlotType)
      .map((s) => s.musicSlotType);
    expect(slotTypes).toContain("RESPONSES");
    expect(slotTypes).toContain("PSALM");
    expect(slotTypes).toContain("CANTICLE_MAGNIFICAT");
    expect(slotTypes).toContain("CANTICLE_NUNC_DIMITTIS");
    expect(slotTypes).toContain("ANTHEM");
    expect(slotTypes).toContain("HYMN");
  });

  it("has placeholders for dynamic content", () => {
    const placeholders = BCP_EVENSONG.sections
      .filter((s) => s.placeholder)
      .map((s) => s.placeholder);
    expect(placeholders).toContain("collect");
    expect(placeholders).toContain("reading-ot");
    expect(placeholders).toContain("reading-epistle");
    expect(placeholders).toContain("reading-psalm");
  });

  it("has major section dividers", () => {
    const majors = BCP_EVENSONG.sections
      .filter((s) => s.majorSection)
      .map((s) => s.majorSection);
    expect(majors.length).toBeGreaterThanOrEqual(3);
  });

  it("all blocks have valid speaker types", () => {
    const validSpeakers = ["president", "all", "reader", "deacon", "rubric"];
    for (const section of BCP_EVENSONG.sections) {
      for (const block of section.blocks) {
        expect(validSpeakers).toContain(block.speaker);
      }
    }
  });
});
