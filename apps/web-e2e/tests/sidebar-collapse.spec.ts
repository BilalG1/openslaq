import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Sidebar Collapse", () => {
  test("channels section collapses and expands on header click", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Channels should be visible initially
    await expect(page.getByText("# general")).toBeVisible();

    // Click to collapse
    await page.getByTestId("channels-section-header").click();
    await expect(page.getByText("# general")).not.toBeVisible();

    // Click to expand
    await page.getByTestId("channels-section-header").click();
    await expect(page.getByText("# general")).toBeVisible();
  });

  test("DMs section collapses and expands on header click", async ({ page, testWorkspace }) => {
    // Create a DM so there's content to collapse
    await testWorkspace.api.createDm("e2e-test-user-001");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // DM should be visible initially
    await expect(page.getByText("Test User (you)")).toBeVisible();

    // Click to collapse
    await page.getByTestId("dms-section-header").click();
    await expect(page.getByText("Test User (you)")).not.toBeVisible();

    // Click to expand
    await page.getByTestId("dms-section-header").click();
    await expect(page.getByText("Test User (you)")).toBeVisible();
  });

  test("collapse state persists across page reload", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Channels should be visible initially
    await expect(page.getByText("# general")).toBeVisible();

    // Collapse channels
    await page.getByTestId("channels-section-header").click();
    await expect(page.getByText("# general")).not.toBeVisible();

    // Reload page
    await page.reload();

    // Channels should still be collapsed
    await expect(page.getByTestId("channels-section-header")).toBeVisible();
    await expect(page.getByText("# general")).not.toBeVisible();
  });
});
