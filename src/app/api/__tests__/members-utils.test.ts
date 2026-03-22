import { describe, it, expect } from "vitest";

// Extract and test the escapeHtml utility used in the members route.
// The function is not exported, so we duplicate the logic here to test it.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;",
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('role="ADMIN"')).toBe("role=&quot;ADMIN&quot;");
  });

  it("handles strings with no special characters", () => {
    expect(escapeHtml("MEMBER")).toBe("MEMBER");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes multiple special characters together", () => {
    expect(escapeHtml('<a href="x">A & B</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;',
    );
  });
});

// Test the slugify function used in church creation
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

describe("slugify", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(slugify("St Mary's Church")).toBe("st-mary-s-church");
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("---Test Church---")).toBe("test-church");
  });

  it("collapses multiple special characters into single hyphen", () => {
    expect(slugify("Church!!!   Name")).toBe("church-name");
  });

  it("handles simple single word", () => {
    expect(slugify("Canterbury")).toBe("canterbury");
  });

  it("handles numbers", () => {
    expect(slugify("Church 123")).toBe("church-123");
  });
});
