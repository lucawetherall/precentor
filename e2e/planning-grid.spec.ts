import { test, expect } from "@playwright/test";

const CHURCH_ID = process.env.E2E_CHURCH_ID;

test.describe("planning grid", () => {
  test.skip(!CHURCH_ID, "E2E_CHURCH_ID not configured");

  test("renders the planning page", async ({ page }) => {
    await page.goto(`/churches/${CHURCH_ID}/planning`);
    await expect(page.getByRole("heading", { name: "Planning" })).toBeVisible();
  });

  test("renders a table or empty state when navigating to /planning", async ({ page }) => {
    await page.goto(`/churches/${CHURCH_ID}/planning`);
    // Either a table or the empty-state message should be visible
    const hasTable = await page.locator("table").count() > 0;
    const hasEmpty = await page.getByText(/No service patterns/i).count() > 0;
    const hasNoServices = await page.getByText(/No services found/i).count() > 0;
    expect(hasTable || hasEmpty || hasNoServices).toBeTruthy();
  });

  test("readings popover trigger is visible when a table is shown", async ({ page }) => {
    await page.goto(`/churches/${CHURCH_ID}/planning`);
    const hasTable = await page.locator("table").count() > 0;
    if (!hasTable) {
      test.skip();
      return;
    }
    // The readings column header should be present
    await expect(page.getByRole("columnheader", { name: "Readings" })).toBeVisible();
  });
});

// Task 33: Role gate test
test.describe("role gate", () => {
  // Role-gate verification for /planning is enforced server-side via requireChurchRole.
  // A member-level user attempting to access /planning will be redirected away by the
  // server before the page renders. Full role-gate e2e coverage requires a separate
  // member auth storage state (E2E_MEMBER_STORAGE_STATE) which is not yet configured
  // in this project.
  test.skip(!process.env.E2E_MEMBER_STORAGE_STATE, "member auth state not configured");

  test("member is redirected away from /planning", async ({ page }) => {
    await page.goto(`/churches/${CHURCH_ID}/planning`);
    expect(page.url()).not.toContain("/planning");
  });
});
