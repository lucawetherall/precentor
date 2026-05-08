import { test, expect } from "@playwright/test";

/**
 * End-to-end auth boundary tests.
 *
 * These tests cover the specific bugs found in the audit that unit tests
 * cannot catch — they hinge on cross-page navigation, middleware redirects,
 * and runtime auth state. Each test below would have caught the bug it
 * exists to prevent.
 *
 * Fixtures
 * --------
 * - Scenarios 1 and 2 (MEMBER-role redirects) need a non-admin user. Set
 *   `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` and `E2E_CHURCH_ID` (a church
 *   that user is a MEMBER of, not ADMIN) to enable them. Without those env
 *   vars these scenarios are skipped — the rest still run.
 * - Scenarios 3-5 use the existing `E2E_EMAIL` / `E2E_PASSWORD` fixture
 *   (the same one global-setup.ts uses).
 */

const memberEmail = process.env.E2E_MEMBER_EMAIL;
const memberPassword = process.env.E2E_MEMBER_PASSWORD;
const memberChurchId = process.env.E2E_CHURCH_ID;
const adminEmail = process.env.E2E_EMAIL;
const adminPassword = process.env.E2E_PASSWORD;

const NON_EXISTENT_CHURCH_ID = "00000000-0000-0000-0000-000000000000";

test.describe("Auth boundaries — member-role redirects", () => {
  test.skip(
    !memberEmail || !memberPassword || !memberChurchId,
    "Set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD / E2E_CHURCH_ID to enable.",
  );

  // Use a clean storage state and log in as the member at the start of each
  // test. We don't share this across tests because membership state could
  // (in theory) be mutated by other suites running in parallel.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', memberEmail!);
    await page.fill('input[type="password"]', memberPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|churches)/, { timeout: 15_000 });
  });

  test("member visiting settings is redirected to church overview", async ({ page }) => {
    await page.goto(`/churches/${memberChurchId}/settings`);
    await page.waitForURL(`/churches/${memberChurchId}`, { timeout: 10_000 });
    expect(page.url()).toMatch(new RegExp(`/churches/${memberChurchId}/?$`));
    expect(page.url()).not.toContain("/settings");
  });

  test("member visiting templates settings is redirected to services page", async ({ page }) => {
    await page.goto(`/churches/${memberChurchId}/settings/templates`);
    await page.waitForURL(`/churches/${memberChurchId}/services`, { timeout: 10_000 });
    expect(page.url()).toContain(`/churches/${memberChurchId}/services`);
    expect(page.url()).not.toContain("/templates");
  });
});

test.describe("Auth boundaries — non-membership and missing-church", () => {
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_EMAIL / E2E_PASSWORD to enable.",
  );

  test("authenticated user visiting a nonexistent church lands on /churches, not /login", async ({ page }) => {
    await page.goto(`/churches/${NON_EXISTENT_CHURCH_ID}`);
    // Could redirect via /churches/{id}/layout.tsx (layout-level membership
    // check) or via the page itself; both end at /churches.
    await page.waitForURL(/\/churches\/?$|\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/churches");
    expect(page.url()).not.toMatch(/\/login/);
  });
});

test.describe("Auth boundaries — login redirect parameter", () => {
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_EMAIL / E2E_PASSWORD to enable.",
  );

  // These tests must start unauthenticated — `/login` is in AUTH_ONLY_PATHS
  // so middleware bounces logged-in users away.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rejects protocol-relative redirect (?redirect=//evil.com)", async ({ page }) => {
    await page.goto("/login?redirect=//evil.com");
    await page.fill('input[type="email"]', adminEmail!);
    await page.fill('input[type="password"]', adminPassword!);
    await page.click('button[type="submit"]');
    // Default fallback is /dashboard. Single-church users may be redirected
    // again from there to their church overview, so accept either landing.
    await page.waitForURL(/\/dashboard|\/churches/, { timeout: 15_000 });
    expect(page.url()).not.toContain("evil.com");
    // Make sure we never even attempted a cross-origin navigation.
    const url = new URL(page.url());
    expect(url.hostname).toBe(new URL("http://localhost:3000").hostname);
  });

  test("accepts legitimate same-origin redirect (?redirect=/account)", async ({ page }) => {
    await page.goto("/login?redirect=/account");
    await page.fill('input[type="email"]', adminEmail!);
    await page.fill('input[type="password"]', adminPassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/account/, { timeout: 15_000 });
    expect(page.url()).toContain("/account");
  });
});
