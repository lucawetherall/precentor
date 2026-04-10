import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("landing page has correct heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1s = page.locator("h1");
    await expect(h1s).toHaveCount(1);
    await expect(h1s.first()).toContainText("Precentor");
  });

  test("landing page has lang attribute on html", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "en");
  });

  test("all feature icons have aria-hidden", async ({ page }) => {
    await page.goto("/");
    // All lucide icons in feature cards should have aria-hidden="true"
    const svgs = page.locator("section svg");
    const count = await svgs.count();
    for (let i = 0; i < count; i++) {
      await expect(svgs.nth(i)).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("forms have proper labels", async ({ page }) => {
    await page.goto("/login");
    // Email input should have associated label
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();

    // Password input should have associated label
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
  });

  test("error messages have role=alert", async ({ page }) => {
    await page.goto("/signup");
    // Fill in mismatched passwords to trigger client-side error
    await page.locator("#name").fill("Test User");
    await page.locator("#email").fill("test@example.com");
    await page.locator("#password").fill("password123");
    await page.locator("#confirm-password").fill("different123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Error message should appear with role="alert"
    const errorMsg = page.locator('p[role="alert"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText("Passwords do not match");
  });

  test("buttons have proper disabled styling", async ({ page }) => {
    await page.goto("/login");
    const button = page.getByRole("button", { name: /sign in/i });
    // Button should have proper disabled styling (pointer-events-none + opacity)
    const classes = await button.getAttribute("class");
    expect(classes).toContain("disabled:opacity-50");
  });
});
