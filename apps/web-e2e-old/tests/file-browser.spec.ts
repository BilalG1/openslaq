import { expect } from "@playwright/test";
import { sharedTest as test } from "./helpers/test-workspace";
import { openWorkspaceChannel } from "./helpers/chat-ui";

test.describe("File browser", () => {
  test("sidebar shows Files link and navigates to files view", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Files link should be in sidebar
    await expect(page.getByTestId("files-view-link")).toBeVisible();
    await expect(page.getByTestId("files-view-link")).toContainText("Files");

    // Click it to navigate
    await page.getByTestId("files-view-link").click();
    await expect(page.getByTestId("files-view")).toBeVisible();

    // Should show empty state since no files uploaded
    await expect(page.getByTestId("files-empty-state")).toBeVisible();
  });

  test("channel files button opens popover", async ({ page, testWorkspace }) => {
    await openWorkspaceChannel(page, testWorkspace.slug);

    // Open overflow menu and click channel files
    await page.getByTestId("channel-overflow-menu").click();
    await page.getByTestId("channel-files-button").click();
    await expect(page.getByTestId("channel-files-popover")).toBeVisible();

    // Should show empty state
    await expect(page.getByTestId("channel-files-empty")).toBeVisible();
  });
});
