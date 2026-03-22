import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero section with correct heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Precentor");
  });

  test("displays feature cards", async ({ page }) => {
    await page.goto("/");
    const features = page.locator("h3");
    await expect(features).toHaveCount(9); // 6 feature cards + 3 steps
  });

  test("has working navigation links", async ({ page }) => {
    await page.goto("/");

    // Check signup link exists and is visible
    const signupLink = page.getByRole("link", { name: /get started/i });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");

    // Check sign in link
    const signinLink = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signinLink).toBeVisible();
    await expect(signinLink).toHaveAttribute("href", "/login");
  });

  test("has skip to content link for accessibility", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test("has proper meta tags", async ({ page }) => {
    await page.goto("/");
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      "content",
      /church of england/i
    );
  });

  test("footer shows copyright", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toContainText("Precentor");
    await expect(footer).toContainText(new Date().getFullYear().toString());
  });
});
