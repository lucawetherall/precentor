import { test, expect } from "@playwright/test";

// Note: These tests require a seeded database and authenticated session.
// They serve as documentation of expected behavior and can be run
// against a local dev environment with proper setup.
//
// Required test fixtures:
//   - A church (e.g. id: "test-church-id")
//   - A liturgical day with a seeded date (e.g. "2026-03-29" — Palm Sunday)
//   - At least one service on that day for the church
//
// Set these env vars for your local setup:
//   E2E_CHURCH_ID, E2E_SERVICE_DATE, E2E_SERVICE_ID
//
// Authentication: tests assume an active browser session cookie is present.
// You can achieve this by storing auth state with Playwright's storageState.

const CHURCH_ID = process.env.E2E_CHURCH_ID ?? "test-church-id";
const SERVICE_DATE = process.env.E2E_SERVICE_DATE ?? "2026-03-29";
const SERVICE_DETAIL_URL = `/churches/${CHURCH_ID}/services/${SERVICE_DATE}`;
const SERVICES_LIST_URL = `/churches/${CHURCH_ID}/services`;
const TEMPLATES_URL = `/churches/${CHURCH_ID}/settings/templates`;

test.describe("Service Editor", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a service detail page.
    // Assumes test fixtures: a church, a liturgical day, and a service.
    await page.goto(SERVICE_DETAIL_URL);
  });

  test("should display section editor with expected sections", async ({
    page,
  }) => {
    // Verify the page heading renders with the liturgical day name
    await expect(page.locator("h1")).toBeVisible();

    // Verify the service planner section heading is present
    const servicesHeading = page.getByRole("heading", { name: /services/i });
    await expect(servicesHeading).toBeVisible();

    // The section editor "Running Order" heading should be visible
    await expect(
      page.getByText("Running Order", { exact: false })
    ).toBeVisible();

    // Major section dividers (e.g. THE GATHERING) should appear if sections exist
    // We look for divider text; actual content depends on seed data
    const gatheringDivider = page.getByText("THE GATHERING", { exact: false });
    // This may or may not be present depending on seed; check visibility if it exists
    const count = await gatheringDivider.count();
    if (count > 0) {
      await expect(gatheringDivider.first()).toBeVisible();
    }

    // The "Add section" trigger should always be visible in the section editor
    await expect(
      page.getByRole("button", { name: /add section/i })
    ).toBeVisible();
  });

  test("should reorder sections via drag and drop", async ({ page }) => {
    // Wait for section rows to load
    await page.waitForSelector('[aria-label="Drag to reorder"]', {
      timeout: 10_000,
    });

    const dragHandles = page.locator('[aria-label="Drag to reorder"]');
    const handleCount = await dragHandles.count();

    if (handleCount < 2) {
      test.skip();
      return;
    }

    // Record the text of the first two section titles before drag
    const sectionTitles = page.locator(
      ".space-y-1 > div .text-sm.font-heading"
    );
    const titlesBefore = await sectionTitles.allTextContents();

    // Drag the first section handle over the second section
    const firstHandle = dragHandles.nth(0);
    const secondHandle = dragHandles.nth(1);

    const sourceBounds = await firstHandle.boundingBox();
    const targetBounds = await secondHandle.boundingBox();

    if (!sourceBounds || !targetBounds) {
      test.skip();
      return;
    }

    // Perform drag: mousedown on first handle, move to second, release
    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2,
      targetBounds.y + targetBounds.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for any save animation ("Saved" indicator)
    await page.waitForTimeout(500);

    // Verify order changed: first title should now differ from titlesBefore[0]
    const titlesAfter = await sectionTitles.allTextContents();
    // If there are at least 2 sections, the order should have changed
    if (titlesBefore.length >= 2 && titlesAfter.length >= 2) {
      expect(titlesAfter[0]).not.toBe(titlesBefore[0]);
    }
  });

  test("should hide and show a section", async ({ page }) => {
    // Wait for section rows to load
    await page.waitForSelector('[aria-label^="Hide"]', { timeout: 10_000 });

    // Find the first visible section's hide button
    const hideButton = page
      .getByRole("button", { name: /^hide/i })
      .first();
    await expect(hideButton).toBeVisible();

    // Get the section row containing this button
    // The hide button's parent row has opacity-50 when hidden
    const sectionRow = hideButton.locator("xpath=../../.."); // traverse up to .relative.border div

    await hideButton.click();

    // After hiding, the row should have reduced opacity
    // and a "hidden" badge should appear
    const hiddenBadge = page.getByText("hidden", { exact: true }).first();
    await expect(hiddenBadge).toBeVisible({ timeout: 5_000 });

    // The show button should now be present (aria-label="Show section")
    const showButton = page.getByRole("button", { name: /^show/i }).first();
    await expect(showButton).toBeVisible();

    // Click show to restore
    await showButton.click();

    // The "hidden" badge should disappear
    await expect(hiddenBadge).not.toBeVisible({ timeout: 5_000 });
  });

  test("should delete a section with confirmation", async ({ page }) => {
    // Wait for sections to load — look for any delete button
    await page.waitForSelector('[aria-label^="Delete"]', { timeout: 10_000 });

    // Count sections before deletion
    const sectionRows = page.locator(".space-y-1 > div");
    const countBefore = await sectionRows.count();

    if (countBefore === 0) {
      test.skip();
      return;
    }

    // Find a liturgical text section (BookOpen icon / blue) to trigger confirmation dialog
    // Alternatively, click the first delete button and handle the confirm dialog
    const deleteButton = page
      .getByRole("button", { name: /^delete/i })
      .first();
    await expect(deleteButton).toBeVisible();

    // Set up dialog handler to accept the confirmation
    page.on("dialog", (dialog) => dialog.accept());

    await deleteButton.click();

    // After deletion, section count should decrease by 1
    await page.waitForTimeout(500);
    const countAfter = await sectionRows.count();
    expect(countAfter).toBe(countBefore - 1);
  });

  test("should add a hymn section", async ({ page }) => {
    // Count current sections before adding
    const sectionRows = page.locator(".space-y-1 > div");
    const countBefore = await sectionRows.count();

    // Click the "Add section" trigger (a dashed-border button at the bottom of the list)
    const addSectionTrigger = page.getByRole("button", {
      name: /add section/i,
    });
    await expect(addSectionTrigger).toBeVisible();
    await addSectionTrigger.click();

    // The dialog should open showing section type picker
    await expect(
      page.getByRole("dialog")
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByRole("heading", { name: /choose section type/i })
    ).toBeVisible();

    // Click the "Hymn" option
    const hymnOption = page.getByRole("button", { name: /^hymn$/i });
    await expect(hymnOption).toBeVisible();
    await hymnOption.click();

    // Now the dialog should show the hymn confirmation step
    await expect(
      page.getByRole("heading", { name: /add section/i })
    ).toBeVisible();

    // Description for hymn slot should be visible
    await expect(
      page.getByText(/adds a hymn slot/i)
    ).toBeVisible();

    // Click "Add Hymn" to confirm
    const addHymnButton = page.getByRole("button", { name: /add hymn/i });
    await expect(addHymnButton).toBeVisible();
    await addHymnButton.click();

    // Dialog should close and section count should increase
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    const countAfter = await sectionRows.count();
    expect(countAfter).toBeGreaterThan(countBefore);

    // A new "Hymn" section should appear in the running order
    const hymnTitle = page.getByText("Hymn", { exact: true });
    await expect(hymnTitle.first()).toBeVisible();
  });

  test("should adjust verse count with stepper", async ({ page }) => {
    // Look for a verse stepper (aria-label="Verse count")
    const verseStepper = page.locator('[aria-label="Verse count"]').first();

    // If no stepper is visible, hymns may not have been assigned — skip
    const stepperVisible = await verseStepper.isVisible();
    if (!stepperVisible) {
      test.skip();
      return;
    }

    // Read the current verse count display (e.g. "3 of 5 v.")
    const countDisplay = verseStepper.locator("span").first();
    const textBefore = await countDisplay.textContent();

    // Click the "More verses" (+) button
    const incrementButton = page.getByRole("button", {
      name: /more verses/i,
    }).first();
    await expect(incrementButton).not.toBeDisabled();
    await incrementButton.click();

    // Wait for the saving spinner to clear
    await page.waitForTimeout(300);
    const textAfterIncrement = await countDisplay.textContent();

    // Verse count should have increased
    expect(textAfterIncrement).not.toBe(textBefore);

    // Click "Fewer verses" (−) to decrement
    const decrementButton = page.getByRole("button", {
      name: /fewer verses/i,
    }).first();
    await expect(decrementButton).not.toBeDisabled();
    await decrementButton.click();

    await page.waitForTimeout(300);
    const textAfterDecrement = await countDisplay.textContent();

    // Should have returned to the original count
    expect(textAfterDecrement).toBe(textBefore);
  });

  test("should choose a collect", async ({ page }) => {
    // The collect chooser lives inside a service details area
    // Look for the collect source <select> (aria-label="Collect source")
    const collectSource = page.getByRole("combobox", {
      name: /collect source/i,
    }).first();

    const collectSourceVisible = await collectSource.isVisible();
    if (!collectSourceVisible) {
      test.skip();
      return;
    }

    // Current source should default to CW or BCP
    const initialValue = await collectSource.inputValue();
    expect(["cw", "bcp", "custom"]).toContain(initialValue);

    // Switch from CW to BCP
    await collectSource.selectOption("bcp");

    // Wait for the collect picker to update
    const collectPicker = page.getByRole("combobox", {
      name: /select collect/i,
    }).first();
    await expect(collectPicker).toBeVisible({ timeout: 5_000 });

    // The collect text preview should update (italic quote block)
    const preview = page.locator("p.italic.text-muted-foreground").first();
    // It may take a moment to load; wait for content
    await expect(preview).not.toBeEmpty({ timeout: 5_000 });

    // Switch to Custom
    await collectSource.selectOption("custom");

    // Custom textarea should appear
    const customTextarea = page.getByRole("textbox", {
      name: /custom collect text/i,
    });
    await expect(customTextarea).toBeVisible({ timeout: 3_000 });

    // Type custom text
    await customTextarea.fill("Almighty God, grant us grace to cast away the works of darkness…");

    // Blur to save
    await customTextarea.blur();

    // A "Saved" indicator should appear briefly
    await expect(
      page.getByText("Saved", { exact: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should browse and select eucharistic prayer", async ({ page }) => {
    // The eucharistic prayer browser trigger is a link-styled button
    // It shows "Choose prayer…" or the name of the current prayer
    const choosePrayerLink = page.getByText(/choose prayer/i).first();
    const choosePrayerVisible = await choosePrayerLink.isVisible();

    if (!choosePrayerVisible) {
      // Also try the named prayer trigger (if a prayer is already selected)
      const prayerTrigger = page
        .locator('[data-radix-collection-item], .underline.underline-offset-2')
        .filter({ hasText: /prayer/i })
        .first();

      if (!(await prayerTrigger.isVisible())) {
        test.skip();
        return;
      }
      await prayerTrigger.click();
    } else {
      await choosePrayerLink.click();
    }

    // A sheet panel should open from the right
    await expect(
      page.getByRole("heading", { name: /eucharistic prayers/i })
    ).toBeVisible({ timeout: 5_000 });

    // Wait for the prayer list to load
    const prayerItems = page.locator(".space-y-2 > div");
    await expect(prayerItems.first()).toBeVisible({ timeout: 10_000 });

    // Verify at least one prayer is listed
    const prayerCount = await prayerItems.count();
    expect(prayerCount).toBeGreaterThan(0);

    // Select the first prayer
    const selectButton = page
      .getByRole("button", { name: /^select$/i })
      .first();
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    // Sheet should close after selection
    await expect(
      page.getByRole("heading", { name: /eucharistic prayers/i })
    ).not.toBeVisible({ timeout: 5_000 });

    // The trigger should now show the prayer name (no longer "Choose prayer…")
    const prayerNames = page.locator(".underline.underline-offset-2");
    const triggerText = await prayerNames.first().textContent();
    expect(triggerText).not.toMatch(/choose prayer/i);
  });

  test("should preview and edit booklet", async ({ page }) => {
    // Find the "Preview & Edit" button in the service planner action bar
    const previewButton = page.getByRole("button", {
      name: /preview & edit/i,
    });
    await expect(previewButton).toBeVisible();

    // Click to open the booklet preview panel
    await previewButton.click();

    // The preview panel should render with "Preview & Edit" toolbar heading
    await expect(
      page.getByText("Preview & Edit", { exact: true })
    ).toBeVisible({ timeout: 10_000 });

    // The church name heading should appear in the preview content
    const previewContent = page.locator(".font-serif");
    await expect(previewContent.first()).toBeVisible({ timeout: 10_000 });

    // Find a clickable text block (hover:bg-primary/5 span) to edit
    const editableBlocks = page.locator(
      'span.cursor-text[title="Click to edit"]'
    );
    const blockCount = await editableBlocks.count();

    if (blockCount > 0) {
      const firstBlock = editableBlocks.first();
      const originalText = await firstBlock.textContent();
      await firstBlock.click();

      // A textarea should appear for editing
      const textarea = page.locator("textarea").first();
      await expect(textarea).toBeVisible({ timeout: 3_000 });

      // Type new text
      await textarea.fill("Test override text");

      // Blur to save (clicking away)
      await page.keyboard.press("Tab");

      // "Saved" indicator should appear
      await expect(
        page.getByText("Saved", { exact: true }).first()
      ).toBeVisible({ timeout: 5_000 });

      // "Reset to default" link should now appear for this section
      await expect(
        page.getByText("Reset to default").first()
      ).toBeVisible({ timeout: 3_000 });

      // Reset back to default
      await page.getByText("Reset to default").first().click();

      // "Reset to default" should disappear after reset
      await expect(
        page.getByText("Reset to default").first()
      ).not.toBeVisible({ timeout: 5_000 });
    }

    // Close the preview by clicking "Close Preview"
    const closePreviewButton = page.getByRole("button", {
      name: /close preview/i,
    });
    await expect(closePreviewButton).toBeVisible();
    await closePreviewButton.click();

    // Preview panel should be hidden
    await expect(previewContent.first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("should preview PDF", async ({ page }) => {
    // Find the "Preview PDF" button
    const previewPdfButton = page.getByRole("button", {
      name: /preview pdf/i,
    });
    await expect(previewPdfButton).toBeVisible();

    // Click to open the PDF preview dialog
    await previewPdfButton.click();

    // A full-screen dialog should open with "PDF Preview" title
    await expect(
      page.getByRole("dialog")
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByRole("heading", { name: /pdf preview/i })
    ).toBeVisible({ timeout: 5_000 });

    // "Download PDF" button should be present in the dialog header
    await expect(
      page.getByRole("button", { name: /download pdf/i })
    ).toBeVisible();

    // "Download DOCX" button should be present
    await expect(
      page.getByRole("button", { name: /download docx/i })
    ).toBeVisible();

    // An iframe for the PDF preview should eventually render
    const iframe = page.locator('iframe[title="PDF Preview"]');
    // The PDF may take time to generate; we just verify the iframe is present
    await expect(iframe).toBeVisible({ timeout: 30_000 });

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("dialog")
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test("should show completeness indicators", async ({ page }) => {
    // Navigate to the services list
    await page.goto(SERVICES_LIST_URL);

    await expect(
      page.getByRole("heading", { name: /upcoming services/i })
    ).toBeVisible({ timeout: 10_000 });

    // Find service cards (Links containing liturgical day info)
    const serviceCards = page.locator("a.flex.items-center.gap-4.border");
    const cardCount = await serviceCards.count();

    if (cardCount === 0) {
      // No seeded data; skip
      test.skip();
      return;
    }

    // Find a card that has a service with a completeness dot
    // Dots are <span> elements with rounded-full and a colour class
    const completenessDots = page.locator(
      'span.inline-block.w-2.h-2.rounded-full'
    );
    const dotCount = await completenessDots.count();

    // If any services exist on the list, there should be at least one dot
    // (dots only appear for cards with planned services)
    // We verify dots have a title attribute indicating status
    if (dotCount > 0) {
      const firstDot = completenessDots.first();
      const title = await firstDot.getAttribute("title");
      expect(title).toMatch(/service (complete|partially complete|empty)/i);
    }
  });

  test("should delete a service", async ({ page }) => {
    // The "Delete service" button is in the service planner action bar
    const deleteServiceButton = page.getByRole("button", {
      name: /delete service/i,
    });
    await expect(deleteServiceButton).toBeVisible({ timeout: 10_000 });

    // Set up dialog handler to accept the confirmation
    page.on("dialog", async (dialog) => {
      // Verify confirmation message
      expect(dialog.message()).toMatch(
        /delete this service.*cannot be undone/i
      );
      await dialog.accept();
    });

    await deleteServiceButton.click();

    // After successful deletion, should either:
    // (a) show no active service (empty state) if no other services exist, or
    // (b) switch to another service tab
    // The "Delete service" button should no longer be visible for the deleted service
    await page.waitForTimeout(1_000);

    // Either we see an empty state or a toast "Service deleted"
    const deletedFeedback =
      page.getByText("Service deleted", { exact: false }).first();
    // Toast may appear briefly
    await expect(deletedFeedback).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Church Template Admin", () => {
  test("should list service type templates", async ({ page }) => {
    // Navigate to settings/templates
    await page.goto(TEMPLATES_URL);

    // Page heading should be present
    await expect(
      page.getByRole("heading", { name: /service templates/i })
    ).toBeVisible({ timeout: 10_000 });

    // Description text should be present
    await expect(
      page.getByText(/customise the section structure/i)
    ).toBeVisible();

    // At least one template card should be listed (if DB is seeded)
    const templateCards = page.locator(
      ".border.border-border.bg-card.shadow-sm"
    );
    const cardCount = await templateCards.count();

    if (cardCount > 0) {
      // Each card should have a heading (the service type label)
      const firstCardHeading = templateCards
        .first()
        .locator(".font-heading.text-base.font-semibold");
      await expect(firstCardHeading).toBeVisible();

      // A "Customise" or "Custom" badge button should be in each card
      const firstCardActions = templateCards.first().locator("button");
      await expect(firstCardActions.first()).toBeVisible();
    }
  });

  test("should customise a template", async ({ page }) => {
    await page.goto(TEMPLATES_URL);

    // Wait for the template list to render
    await expect(
      page.getByRole("heading", { name: /service templates/i })
    ).toBeVisible({ timeout: 10_000 });

    // Find a template card that is not yet customised (has a "Customise" button)
    const customiseButton = page
      .getByRole("button", { name: /^customise$/i })
      .first();

    const hasCustomise = await customiseButton.isVisible();
    if (!hasCustomise) {
      test.skip();
      return;
    }

    // Click Customise to create a custom template
    await customiseButton.click();

    // A "Custom" badge should appear on the card
    await expect(
      page.getByText("Custom", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });

    // A toast "Custom template created" should appear
    await expect(
      page.getByText("Custom template created", { exact: false })
    ).toBeVisible({ timeout: 5_000 });

    // Expand the card to see sections
    const expandButton = page
      .getByRole("button", { name: /customise|expand/i })
      .first();
    // Actually the expand trigger is the chevron button on the card header
    // Look for the card's toggle button (has aria-expanded)
    const cardToggle = page
      .locator('[aria-expanded]')
      .first();
    await cardToggle.click();

    // Sections should now be visible
    const sectionRows = page.locator(".divide-y.divide-border > div").first();
    await expect(sectionRows).toBeVisible({ timeout: 5_000 });
  });

  test("should reset template to default", async ({ page }) => {
    await page.goto(TEMPLATES_URL);

    await expect(
      page.getByRole("heading", { name: /service templates/i })
    ).toBeVisible({ timeout: 10_000 });

    // Find a card with "Reset to default" (meaning it already has a custom template)
    const resetButton = page
      .getByRole("button", { name: /reset to default/i })
      .first();

    const hasReset = await resetButton.isVisible();
    if (!hasReset) {
      // No customised templates exist; skip
      test.skip();
      return;
    }

    // Set up dialog handler to confirm the reset
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toMatch(
        /delete the custom template.*system default/i
      );
      await dialog.accept();
    });

    await resetButton.click();

    // After reset, the "Custom" badge should disappear
    await expect(
      page.getByText("Custom", { exact: true }).first()
    ).not.toBeVisible({ timeout: 5_000 });

    // A "Customise" button should now appear instead
    await expect(
      page.getByRole("button", { name: /^customise$/i }).first()
    ).toBeVisible({ timeout: 3_000 });

    // Toast "Template reset to default" should appear
    await expect(
      page.getByText("Template reset to default", { exact: false })
    ).toBeVisible({ timeout: 5_000 });
  });
});
