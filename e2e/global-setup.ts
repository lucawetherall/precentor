import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_STATE_PATH = path.join(__dirname, ".auth-state.json");
const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] });

/**
 * Playwright global setup: logs in and saves auth state to disk.
 *
 * Required env vars for authenticated tests:
 *   E2E_EMAIL      - email of an existing user account
 *   E2E_PASSWORD   - that user's password
 *
 * When credentials are not provided (e.g. CI without secrets), an empty
 * auth state is written so that public-page tests still run correctly.
 * Tests that require authentication will redirect to /login and be skipped
 * or fail gracefully rather than crashing the entire runner.
 */
export default async function globalSetup() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[E2E setup] E2E_EMAIL / E2E_PASSWORD not set — writing empty auth state. " +
        "Public-page tests will pass; authenticated tests will redirect to /login.",
    );
    fs.writeFileSync(AUTH_STATE_PATH, EMPTY_STATE);
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

  await page.context().storageState({ path: AUTH_STATE_PATH });
  await browser.close();
}
