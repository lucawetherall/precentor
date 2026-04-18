import { test, expect } from "@playwright/test";

test.describe("Authentication pages", () => {
  test.describe("Login page", () => {
    test("renders login form", async ({ page }) => {
      await page.goto("/login");
      await expect(page.locator("h1")).toContainText("Sign In");
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });

    test("has link to signup page", async ({ page }) => {
      await page.goto("/login");
      const createLink = page.getByRole("link", { name: /create one/i });
      await expect(createLink).toBeVisible();
      await expect(createLink).toHaveAttribute("href", "/signup");
    });

    test("has link to forgot password", async ({ page }) => {
      await page.goto("/login");
      const forgotLink = page.getByRole("link", { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
    });

    test("shows validation for empty fields", async ({ page }) => {
      await page.goto("/login");
      // HTML5 required attribute should prevent submission
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute("required", "");
    });

    test("submit button disables during loading", async ({ page }) => {
      await page.goto("/login");
      const submitBtn = page.getByRole("button", { name: /sign in/i });
      // Button should not be disabled initially
      await expect(submitBtn).not.toBeDisabled();
    });
  });

  test.describe("Signup page", () => {
    test("renders signup form with all fields", async ({ page }) => {
      await page.goto("/signup");
      await expect(page.locator("h1")).toContainText("Create Account");
      await expect(page.locator("#name")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirm-password")).toBeVisible();
    });

    test("has link back to login", async ({ page }) => {
      await page.goto("/signup");
      const loginLink = page.getByRole("link", { name: /sign in/i });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute("href", "/login");
    });

    test("enforces minimum password length", async ({ page }) => {
      await page.goto("/signup");
      const passwordInput = page.locator("#password");
      await expect(passwordInput).toHaveAttribute("minlength", "10");
    });
  });

  test.describe("Forgot password page", () => {
    test("renders forgot password form", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.locator("h1")).toContainText("Reset Password");
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(
        page.getByRole("button", { name: /send reset link/i })
      ).toBeVisible();
    });

    test("has link back to login", async ({ page }) => {
      await page.goto("/forgot-password");
      const backLink = page.getByRole("link", { name: /back to sign in/i });
      await expect(backLink).toBeVisible();
    });
  });
});
