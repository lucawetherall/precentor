import { test, expect } from "@playwright/test";

test.describe("role configurability", () => {
  test.skip(!process.env.USE_ROLE_SLOTS_MODEL, "requires USE_ROLE_SLOTS_MODEL=true");

  test("admin creates preset, edits slots, and a new service snapshots those slots", async ({ page }) => {
    // TODO: seed fixture data and implement
    test.skip(true, "not yet implemented");
  });

  test("singer without Organist role sees em-dash on ORGANIST_ONLY service", async ({ page }) => {
    test.skip(true, "not yet implemented");
  });

  test("member with multiple roles sees one row with role pills", async ({ page }) => {
    test.skip(true, "not yet implemented");
  });

  test("migration banner appears for a church with unresolved migration issues", async ({ page }) => {
    test.skip(true, "not yet implemented");
  });
});
