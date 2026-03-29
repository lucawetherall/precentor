import { describe, it, expect } from "vitest";

// Extract the shared escapeLike logic for testing
// All three search files (hymns, anthems, mass-settings) use the same function
function escapeLike(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

describe("escapeLike", () => {
  it("escapes percent signs", () => {
    expect(escapeLike("100%")).toBe("100\\%");
  });

  it("escapes underscores", () => {
    expect(escapeLike("foo_bar")).toBe("foo\\_bar");
  });

  it("escapes backslashes", () => {
    expect(escapeLike("path\\to")).toBe("path\\\\to");
  });

  it("escapes all special chars in combination", () => {
    expect(escapeLike("100% of_this\\path")).toBe("100\\% of\\_this\\\\path");
  });

  it("returns empty string unchanged", () => {
    expect(escapeLike("")).toBe("");
  });

  it("returns normal text unchanged", () => {
    expect(escapeLike("Amazing Grace")).toBe("Amazing Grace");
  });

  it("handles multiple consecutive special chars", () => {
    expect(escapeLike("%%__\\\\")).toBe("\\%\\%\\_\\_\\\\\\\\");
  });

  it("handles unicode characters without modification", () => {
    expect(escapeLike("Réquiem für die Seele")).toBe("Réquiem für die Seele");
  });
});
