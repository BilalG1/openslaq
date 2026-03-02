import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Channel Bookmarks", () => {
  test("add and view bookmark", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for channel to load
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Should see the bookmarks bar with add button
    await expect(page.getByTestId("add-bookmark-button")).toBeVisible();

    // Click add bookmark
    await page.getByTestId("add-bookmark-button").click();

    // Fill in the dialog
    await expect(page.getByTestId("bookmark-url-input")).toBeVisible();
    await page.getByTestId("bookmark-url-input").fill("https://example.com");
    await page.getByTestId("bookmark-title-input").fill("Example Site");

    // Submit
    await page.getByTestId("bookmark-add-button").click();

    // Should see the bookmark chip
    await expect(page.getByText("Example Site")).toBeVisible();
  });

  test("bookmark link opens in new tab", async ({ page, testWorkspace }) => {
    // Add a bookmark via API
    const _channel = await testWorkspace.api.getChannelByName("general");
    const _client = await (testWorkspace.api as unknown as { c(): Promise<{ api: { workspaces: Record<string, unknown> } }> }).c();

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Navigate to general
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Add bookmark via UI
    await page.getByTestId("add-bookmark-button").click();
    await page.getByTestId("bookmark-url-input").fill("https://docs.example.com");
    await page.getByTestId("bookmark-title-input").fill("Docs");
    await page.getByTestId("bookmark-add-button").click();

    // Verify the link
    const link = page.getByText("Docs").first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("remove bookmark", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Navigate to general
    await expect(page.getByText("#general")).toBeVisible();
    await page.getByText("#general").click();

    // Add a bookmark first
    await page.getByTestId("add-bookmark-button").click();
    await page.getByTestId("bookmark-url-input").fill("https://to-remove.example.com");
    await page.getByTestId("bookmark-title-input").fill("Remove Me");
    await page.getByTestId("bookmark-add-button").click();

    // Should see the bookmark
    await expect(page.getByText("Remove Me")).toBeVisible();

    // Hover to show remove button, then click it
    const chip = page.getByText("Remove Me").locator("..");
    await chip.hover();

    // Find the remove button within the chip's parent
    const removeButton = chip.locator("button[aria-label*='Remove']");
    await removeButton.click();

    // Bookmark should be gone
    await expect(page.getByText("Remove Me")).not.toBeVisible();
  });
});
