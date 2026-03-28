import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Starred channels", () => {
  test("click star in header → Starred section appears in sidebar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Initially no starred section
    await expect(page.getByTestId("starred-section")).not.toBeVisible();

    // Click the star button
    await page.getByTestId("star-channel-button").click();

    // Starred section should appear
    await expect(page.getByTestId("starred-section")).toBeVisible();
    await expect(page.getByTestId("starred-section")).toContainText("general");
  });

  test("click star again → section disappears", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Star
    await page.getByTestId("star-channel-button").click();
    await expect(page.getByTestId("starred-section")).toBeVisible();

    // Unstar
    await page.getByTestId("star-channel-button").click();
    await expect(page.getByTestId("starred-section")).not.toBeVisible();
  });

  test("starred state persists across page reload", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").first().click();

    // Star the channel
    await page.getByTestId("star-channel-button").click();
    await expect(page.getByTestId("starred-section")).toBeVisible();

    // Reload
    await page.reload();

    // After reload, starred section should still be visible (channel appears in both Starred and Channels)
    await expect(page.getByTestId("starred-section")).toBeVisible();
    await expect(page.getByTestId("starred-section")).toContainText("general");
  });
});
