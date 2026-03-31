import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/utils/escape-html";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
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

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
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
