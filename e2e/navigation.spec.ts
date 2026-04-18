import { test, expect } from "@playwright/test";

test.describe("Navigation and routing", () => {
  test("unauthenticated users are redirected to login for protected routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated users can access public pages", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toContainText("Sunday");
  });

  test("navigating from landing to login works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h1")).toContainText("Sign In");
  });

  test("navigating from landing to signup works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator("h1")).toContainText("Create Account");
  });

  test("navigating between login and signup works", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/signup/);

    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
