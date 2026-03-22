import { describe, it, expect } from "vitest";
import { createStyles } from "../create-styles";
import { DEFAULT_TEMPLATE_LAYOUT } from "@/types/service-sheet";

describe("createStyles", () => {
  it("creates a styles object with expected keys", () => {
    const styles = createStyles(DEFAULT_TEMPLATE_LAYOUT);
    expect(styles).toHaveProperty("page");
    expect(styles).toHaveProperty("header");
    expect(styles).toHaveProperty("footer");
    expect(styles).toHaveProperty("congregationalText");
    expect(styles).toHaveProperty("rubricText");
    expect(styles).toHaveProperty("majorSectionDivider");
  });

  it("uses smaller padding for A5", () => {
    const a5 = createStyles({ ...DEFAULT_TEMPLATE_LAYOUT, paperSize: "A5" });
    const a4 = createStyles({ ...DEFAULT_TEMPLATE_LAYOUT, paperSize: "A4" });
    // A5 should have smaller padding
    const a5Padding = (a5.page as Record<string, unknown>).padding as number;
    const a4Padding = (a4.page as Record<string, unknown>).padding as number;
    expect(a5Padding).toBeLessThan(a4Padding);
  });

  it("applies left-aligned header style", () => {
    const styles = createStyles({ ...DEFAULT_TEMPLATE_LAYOUT, headerStyle: "left-aligned" });
    const textAlign = (styles.header as Record<string, unknown>).textAlign;
    expect(textAlign).toBe("left");
  });

  it("applies centered header style by default", () => {
    const styles = createStyles(DEFAULT_TEMPLATE_LAYOUT);
    const textAlign = (styles.header as Record<string, unknown>).textAlign;
    expect(textAlign).toBe("center");
  });
});
