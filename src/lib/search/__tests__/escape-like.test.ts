import { describe, it, expect } from "vitest";
import { escapeLike } from "../escape-like";

// Tests the real shared escapeLike used by every search builder (hymns,
// anthems, mass-settings, canticle-settings, responses-settings). Previously
// this suite tested an inline copy of the function, so drift in the real
// implementation went uncaught — it now imports the actual source.
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

  it("escapes backslashes before wildcards so escapes aren't double-escaped", () => {
    // A backslash already in the input must become "\\\\", and a following
    // "%" must become "\\%" — never "\\\\%" from re-processing our own escape.
    expect(escapeLike("\\%")).toBe("\\\\\\%");
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
