import { expect } from "@playwright/test";
import { test } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";

test.describe("Channel archiving", () => {
  test("admin sees archive button and can archive a channel", async ({ page, testWorkspace }) => {
    // Create a channel to archive
    await testWorkspace.api.createChannel("archive-test");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for sidebar to load and select the channel
    const channelItem = page.getByText("# archive-test");
    await expect(channelItem).toBeVisible({ timeout: 15000 });
    await channelItem.click();

    // Open overflow menu and click archive
    await expect(page.getByTestId("channel-overflow-menu")).toBeVisible();
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("archive-channel-button").click();
    await expect(page.getByTestId("confirm-archive-button")).toBeVisible();
    await page.getByTestId("confirm-archive-button").click();

    // Channel should be removed from sidebar
    await expect(page.getByText("# archive-test")).not.toBeVisible({ timeout: 10000 });
  });

  test("archive button not shown for #general", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for general to appear and click it
    const generalItem = page.getByText("# general").first();
    await expect(generalItem).toBeVisible({ timeout: 15000 });
    await generalItem.click();

    // Wait for header to render with member count (confirms channel is loaded)
    await expect(page.getByTestId("channel-member-count")).toBeVisible();

    // Overflow menu should not be visible for #general (no secondary actions that apply)
    // Even if overflow exists, archive button should not be present
    const overflowBtn = page.getByTestId("channel-overflow-menu");
    if (await overflowBtn.isVisible()) {
      await overflowBtn.click();
      await expect(page.getByTestId("archive-channel-button")).not.toBeVisible();
    }
  });

  test("archived channel shows read-only banner and badge", async ({ page, testWorkspace }) => {
    // Create a channel, navigate to workspace, select it, then archive via API
    await testWorkspace.api.createChannel("readonly-test");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Wait for and select the channel
    const channelItem = page.getByText("# readonly-test");
    await expect(channelItem).toBeVisible({ timeout: 15000 });
    await channelItem.click();

    // Wait for the channel to fully load
    await expect(page.getByTestId("channel-member-count")).toBeVisible();

    // Archive via the overflow menu
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("archive-channel-button").click();
    await page.getByTestId("confirm-archive-button").click();

    // After archiving, the archived banner should be visible in the main content
    await expect(page.getByTestId("archived-channel-banner")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("This channel has been archived")).toBeVisible();

    // Archived badge should appear in header
    await expect(page.getByTestId("archived-badge")).toBeVisible();
    await expect(page.getByTestId("archived-badge")).toHaveText("Archived");
  });

  test("admin can unarchive a channel via header button", async ({ page, testWorkspace }) => {
    await testWorkspace.api.createChannel("unarchive-test");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);

    // Select the channel
    const channelItem = page.getByText("# unarchive-test");
    await expect(channelItem).toBeVisible({ timeout: 15000 });
    await channelItem.click();
    await expect(page.getByTestId("channel-member-count")).toBeVisible();

    // Archive via the overflow menu
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("archive-channel-button").click();
    await page.getByTestId("confirm-archive-button").click();

    // Wait for archived state — unarchive is in the overflow menu
    await expect(page.getByTestId("channel-overflow-menu")).toBeVisible({ timeout: 10000 });

    // Unarchive via overflow menu
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("unarchive-channel-button").click();

    // After unarchiving, archived elements should disappear
    await expect(page.getByTestId("archived-channel-banner")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("archived-badge")).not.toBeVisible();

    // Channel should reappear in sidebar
    await expect(page.getByText("# unarchive-test")).toBeVisible();
  });
});
