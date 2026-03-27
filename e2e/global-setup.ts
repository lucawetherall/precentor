import { chromium } from "@playwright/test";

/**
 * Playwright global setup: logs in and saves auth state to disk.
 *
 * Required env vars:
 *   E2E_EMAIL      - email of an existing user account
 *   E2E_PASSWORD   - that user's password
 *
 * The saved auth state is loaded per-test via playwright.config.ts
 * storageState so each test starts already authenticated.
 */
export default async function globalSetup() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[E2E setup] E2E_EMAIL / E2E_PASSWORD not set — skipping auth. " +
        "Tests will run unauthenticated and may fail on protected pages.",
    );
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or churches page after login
  await page.waitForURL(/\/(dashboard|churches)/, { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth-state.json" });
  await browser.close();
}
